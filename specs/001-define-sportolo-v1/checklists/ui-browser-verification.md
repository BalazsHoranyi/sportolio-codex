# UI Browser Verification Checklist

Use this checklist for every changed frontend page/component.
Verification must be executed with:
- agent-browser
- chrome-devtools-mcp

## Metadata

- Date:
- Verifier:
- Branch:
- Commit:

## Scope

- [ ] List changed UI files and routes.
- [ ] Attach at least one desktop screenshot per changed route.
- [ ] Attach at least one mobile screenshot per changed route.

## Functional Checks

- [ ] Success state verified.
- [ ] Loading state verified.
- [ ] Empty state verified.
- [ ] Error state verified.
- [ ] Primary interactions (click/form/navigation) verified.

## Accessibility Checks

- [ ] Keyboard navigation works for primary controls.
- [ ] Focus visibility is present and consistent.
- [ ] Labels/status text are announced/readable.
- [ ] No critical accessibility regressions observed in manual review.

## Responsive Checks

- [ ] Mobile layout (<=390px width) verified.
- [ ] Tablet layout (~768px width) verified.
- [ ] Desktop layout (>=1280px width) verified.

## Visual Quality Checks

- [ ] Typography and spacing align with design direction.
- [ ] Components use approved modern UI system (Aceternity/shadcn/Tailwind).
- [ ] No placeholder/default-browser styling remains.

## Evidence

- [ ] Browser verification notes saved under `frontend/verification/`.
- [ ] Screenshots saved under `specs/001-define-sportolo-v1/checklists/artifacts/`.
