SHELL := /bin/bash
.DEFAULT_GOAL := all

BACKEND_DIR ?= backend
FRONTEND_DIR ?= frontend

.PHONY: all help install precommit-install \
	format lint typecheck test build release frontend-release frontend-verify-ui \
	backend-install backend-format backend-lint backend-typecheck backend-test \
	frontend-install frontend-format frontend-lint frontend-typecheck frontend-test frontend-build

define backend_run
@if [ -f "$(BACKEND_DIR)/Makefile" ]; then \
	$(MAKE) -C "$(BACKEND_DIR)" $(1); \
elif [ -f "$(BACKEND_DIR)/pyproject.toml" ]; then \
	if ! command -v uv >/dev/null 2>&1; then \
		echo "ERROR: uv is required for backend targets"; \
		exit 1; \
	fi; \
	$(2); \
else \
	echo "Skipping backend $(1): $(BACKEND_DIR)/pyproject.toml not found"; \
fi
endef

define frontend_run
@if [ -f "$(FRONTEND_DIR)/Makefile" ]; then \
	$(MAKE) -C "$(FRONTEND_DIR)" $(1); \
elif [ -f "$(FRONTEND_DIR)/package.json" ]; then \
	cd "$(FRONTEND_DIR)"; \
	if [ -f pnpm-lock.yaml ]; then \
		echo "Running frontend $(1) with pnpm"; \
		pnpm run $(1); \
	elif [ -f yarn.lock ]; then \
		echo "Running frontend $(1) with yarn"; \
		yarn $(1); \
	elif [ -f bun.lockb ] || [ -f bun.lock ]; then \
		echo "Running frontend $(1) with bun"; \
		bun run $(1); \
	else \
		echo "Running frontend $(1) with npm"; \
		npm run $(1); \
	fi; \
else \
	echo "Skipping frontend $(1): $(FRONTEND_DIR)/package.json not found"; \
fi
endef

all: format lint typecheck test build ## Run quality + build gates for backend and frontend

release: all frontend-release ## Run release gates including frontend build and browser evidence verification

install: backend-install frontend-install precommit-install ## Install backend/frontend dependencies and git hooks

precommit-install: ## Install pre-commit hooks via uv when available
	@if command -v uv >/dev/null 2>&1; then \
		uvx pre-commit install --install-hooks; \
	else \
		echo "Skipping pre-commit install: uv not found"; \
	fi

format: backend-format frontend-format ## Run formatting for both backend and frontend

lint: backend-lint frontend-lint ## Run linting for both backend and frontend

typecheck: backend-typecheck frontend-typecheck ## Run static typing checks for both backend and frontend

test: backend-test frontend-test ## Run tests for both backend and frontend

build: frontend-build ## Build deployable artifacts

backend-install: ## Install backend dependencies
	$(call backend_run,install,uv sync --project "$(BACKEND_DIR)")

backend-format: ## Format backend code
	$(call backend_run,format,uv run --project "$(BACKEND_DIR)" ruff format "$(BACKEND_DIR)" && uv run --project "$(BACKEND_DIR)" ruff check --fix --fix-only "$(BACKEND_DIR)")

backend-lint: ## Lint backend code
	$(call backend_run,lint,uv run --project "$(BACKEND_DIR)" ruff format --check "$(BACKEND_DIR)" && uv run --project "$(BACKEND_DIR)" ruff check "$(BACKEND_DIR)")

backend-typecheck: ## Typecheck backend code
	$(call backend_run,typecheck,uv run --project "$(BACKEND_DIR)" bash -lc 'if command -v pyright >/dev/null 2>&1; then pyright "$(BACKEND_DIR)"; elif command -v mypy >/dev/null 2>&1; then mypy "$(BACKEND_DIR)"; else echo "ERROR: install pyright or mypy in backend dependencies"; exit 1; fi')

backend-test: ## Run backend tests
	$(call backend_run,test,uv run --project "$(BACKEND_DIR)" pytest)

frontend-install: ## Install frontend dependencies
	@if [ -f "$(FRONTEND_DIR)/Makefile" ]; then \
		$(MAKE) -C "$(FRONTEND_DIR)" install; \
	elif [ -f "$(FRONTEND_DIR)/package.json" ]; then \
		cd "$(FRONTEND_DIR)"; \
		if [ -f pnpm-lock.yaml ]; then \
			echo "Installing frontend dependencies with pnpm"; \
			pnpm install --frozen-lockfile; \
		elif [ -f yarn.lock ]; then \
			echo "Installing frontend dependencies with yarn"; \
			yarn install --frozen-lockfile; \
		elif [ -f bun.lockb ] || [ -f bun.lock ]; then \
			echo "Installing frontend dependencies with bun"; \
			bun install --frozen-lockfile; \
		elif [ -f package-lock.json ]; then \
			echo "Installing frontend dependencies with npm ci"; \
			npm ci; \
		else \
			echo "Installing frontend dependencies with npm install"; \
			npm install; \
		fi; \
	else \
		echo "Skipping frontend install: $(FRONTEND_DIR)/package.json not found"; \
	fi

frontend-format: ## Format frontend code
	$(call frontend_run,format)

frontend-lint: ## Lint frontend code
	$(call frontend_run,lint)

frontend-typecheck: ## Typecheck frontend code
	$(call frontend_run,typecheck)

frontend-test: ## Run frontend tests
	$(call frontend_run,test)

frontend-build: ## Build frontend production bundle
	$(call frontend_run,build)

frontend-release: frontend-build frontend-verify-ui ## Run frontend production quality gates

frontend-verify-ui: ## Verify browser evidence artifacts exist for changed UI work
	$(call frontend_run,verify:ui)

help: ## Show available targets
	@echo "Usage: make <target>"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
