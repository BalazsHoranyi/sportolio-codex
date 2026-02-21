import {
  applyMacroTemplate,
  buildMacroTimelinePreview,
  getMacroTemplates,
} from "../../src/features/planner/macro-templates";
import { createInitialPlannerDraft } from "../../src/features/planner/types";

describe("planner macro templates", () => {
  it("provides all required hybrid profile templates", () => {
    const templates = getMacroTemplates();

    expect(templates.map((template) => template.id)).toEqual([
      "powerlifting_5k",
      "triathlon_strength",
      "strength_cycling",
    ]);
  });

  it("applies triathlon + strength template to a net-new draft", () => {
    const draft = createInitialPlannerDraft();

    const generated = applyMacroTemplate({
      draft,
      templateId: "triathlon_strength",
    });

    expect(generated.planName).toBe("Triathlon + Strength Build");
    expect(generated.goals.length).toBeGreaterThanOrEqual(2);
    expect(generated.goals.some((goal) => goal.modality === "endurance")).toBe(
      true,
    );
    expect(generated.goals.some((goal) => goal.modality === "strength")).toBe(
      true,
    );
    expect(generated.events.length).toBeGreaterThan(0);
    expect(generated.mesocycles.length).toBeGreaterThan(0);
    expect(generated.microcycle.workouts.length).toBeGreaterThan(0);
  });

  it("builds timeline preview from anchor dates and recomputes when event dates move", () => {
    const baseDraft = createInitialPlannerDraft();
    const anchoredDraft = {
      ...baseDraft,
      goals: [
        {
          ...baseDraft.goals[0],
          title: "Deadlift 600",
          metric: "1RM deadlift",
          targetDate: "2026-06-10",
          modality: "strength" as const,
        },
      ],
      events: [
        {
          eventId: "event-1",
          name: "Summer 5k",
          eventDate: "2026-07-20",
          eventType: "race" as const,
        },
      ],
    };

    const firstPreview = buildMacroTimelinePreview(anchoredDraft, {
      leadWeeks: 12,
      cooldownWeeks: 2,
      fallbackStartDate: "2026-01-05",
    });

    expect(firstPreview.anchorSummary.latestAnchorDate).toBe("2026-07-20");
    expect(firstPreview.suggestedEndDate).toBe("2026-08-03");
    expect(firstPreview.suggestedStartDate).toBe("2026-03-18");

    const movedEventPreview = buildMacroTimelinePreview(
      {
        ...anchoredDraft,
        events: [
          {
            ...anchoredDraft.events[0],
            eventDate: "2026-08-15",
          },
        ],
      },
      {
        leadWeeks: 12,
        cooldownWeeks: 2,
        fallbackStartDate: "2026-01-05",
      },
    );

    expect(movedEventPreview.suggestedEndDate).toBe("2026-08-29");
    expect(movedEventPreview.suggestedEndDate).not.toBe(
      firstPreview.suggestedEndDate,
    );
  });
});
