.DEFAULT_GOAL := all

.PHONY: .uv
.uv: ## Check that uv is installed
	@uv --version || echo '🚀 Please install uv: https://docs.astral.sh/uv/getting-started/installation/'

.PHONY: .pre-commit
.pre-commit: ## Check that pre-commit is installed
	@uv run pre-commit -V || echo '🔍 Please install pre-commit: https://pre-commit.com/'

.PHONY: install
install: .uv .pre-commit ## Install the package, dependencies, and pre-commit for local development
	uv sync --frozen --all-extras --all-packages --group lint --group docs
	uvx pre-commit install --install-hooks

.PHONY: sync
sync: .uv ## Update local packages and uv.lock
	uv sync --all-extras --all-packages --group lint --group docs


.PHONY: run-agent
run-agent: ## Run the agent with uvicorn
	@echo "🚀🪐 Launching Agent"
		uv run --env-file .env python ./agents/agent/app/app.py

.PHONY: run-router
run-router: ## Launch the router via script
	@echo "🚀🪐 Launching Router"
		uv run alembic upgrade head
		uv run --env-file .env python ./agents/router/app.py

.PHONY: format
format: ## Format the code
	uv run ruff format
	uv run ruff check --fix --fix-only

.PHONY: lint
lint: ## Lint the code
	uv run ruff format --check
	uv run ruff check

.PHONY: typecheck-pyright
typecheck-pyright:
	@# PYRIGHT_PYTHON_IGNORE_WARNINGS avoids the overhead of making a request to github on every invocation
	PYRIGHT_PYTHON_IGNORE_WARNINGS=1 uv run pyright

.PHONY: typecheck-mypy
typecheck-mypy:
	uv run mypy

.PHONY: typecheck
typecheck: typecheck-pyright ## Run static type checking

.PHONY: typecheck-both  ## Run static type checking with both Pyright and Mypy
typecheck-both: typecheck-pyright typecheck-mypy

.PHONY: test
test: migration-check ## Run tests and collect coverage data
	uv run coverage run -m pytest
	@uv run coverage report

.PHONY: migration-check
migration-check: ## Validate migration naming, graph integrity, downgrade safety, and round-trip behavior
	uv run python scripts/check_migrations.py


.PHONY: test-all-python
test-all-python: ## Run tests on Python 3.10 to 3.13
	UV_PROJECT_ENVIRONMENT=.venv310 uv run --python 3.10 --all-extras coverage run -p -m pytest
	UV_PROJECT_ENVIRONMENT=.venv311 uv run --python 3.11 --all-extras coverage run -p -m pytest
	UV_PROJECT_ENVIRONMENT=.venv312 uv run --python 3.12 --all-extras coverage run -p -m pytest
	UV_PROJECT_ENVIRONMENT=.venv313 uv run --python 3.13 --all-extras coverage run -p -m pytest
	@uv run coverage combine
	@uv run coverage report

.PHONY: testcov
testcov: test ## Run tests and generate a coverage report
	@echo "📊 Building coverage html..."
	@uv run coverage html

.PHONY: update-examples
update-examples: ## Update documentation examples
	uv run -m pytest --update-examples

# `--no-strict` so you can build the docs without insiders packages
.PHONY: docs
docs: ## Build the documentation
	uv sync --frozen --all-extras --all-packages --group lint --group docs
	uv run mkdocs build --no-strict

# `--no-strict` so you can build the docs without insiders packages
.PHONY: docs-serve
docs-serve: ## Build and serve the documentation
	uv run mkdocs serve --no-strict

.PHONY: openapi-check
openapi-check: ## Verify OpenAPI artifact is up to date
	uv run python scripts/check_openapi.py


.PHONY: migrate-create
migrate-create: ## Create a new migration
	uv run alembic revision --autogenerate -m "$(message)"

.PHONY: alembic-local
alembic-local: ## generate tables in local DB instance
	uv run alembic upgrade head

.PHONY: all
all: format lint typecheck testcov ## Run code formatting, linting, static type checks, and tests with coverage report generation

.PHONY: help
help: ## Show this help (usage: make help)
	@echo "🛠️  Usage: make [recipe]"
	@echo "📋 Recipes:"
	@awk '/^[a-zA-Z0-9_-]+:.*?##/ { \
		helpMessage = match($$0, /## (.*)/); \
		if (helpMessage) { \
			recipe = $$1; \
			sub(/:/, "", recipe); \
			printf "  \033[36m%-20s\033[0m %s\n", recipe, substr($$0, RSTART + 3, RLENGTH); \
		} \
	}' $(MAKEFILE_LIST)
