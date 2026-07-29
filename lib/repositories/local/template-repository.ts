import { readTemplates, writeTemplates } from "@/lib/storage";
import { duplicateTemplateData, planFromTemplate, templateFromWorkoutPlan, toTemplateSummary } from "@/lib/templates";
import type { TemplateRepository } from "../template-repository";

export function createLocalTemplateRepository(): TemplateRepository {
  return {
    async getTemplates() {
      return readTemplates().map(toTemplateSummary);
    },

    async getTemplate(_userId, templateId) {
      return readTemplates().find((template) => template.id === templateId) ?? null;
    },

    async createTemplate(_userId, template) {
      writeTemplates([template, ...readTemplates()]);
    },

    async updateTemplate(_userId, template) {
      const templates = readTemplates();
      const index = templates.findIndex((existing) => existing.id === template.id);
      if (index === -1) return;
      const updated = [...templates];
      updated[index] = { ...template, updatedAt: new Date().toISOString() };
      writeTemplates(updated);
    },

    async deleteTemplate(_userId, templateId) {
      writeTemplates(readTemplates().filter((template) => template.id !== templateId));
    },

    async duplicateTemplate(_userId, templateId, newName) {
      const templates = readTemplates();
      const source = templates.find((template) => template.id === templateId);
      if (!source) throw new Error("Template not found");
      const copy = duplicateTemplateData(source, newName);
      writeTemplates([copy, ...templates]);
      return copy;
    },

    async saveGeneratedWorkoutAsTemplate(_userId, plan, goal, name, description) {
      const template = templateFromWorkoutPlan(plan, goal, name, description);
      writeTemplates([template, ...readTemplates()]);
      return template;
    },

    async createWorkoutFromTemplate(_userId, templateId) {
      const template = readTemplates().find((existing) => existing.id === templateId);
      if (!template) throw new Error("Template not found");
      return planFromTemplate(template);
    },

    async toggleFavorite(_userId, templateId, isFavorite) {
      const templates = readTemplates();
      const index = templates.findIndex((template) => template.id === templateId);
      if (index === -1) return;
      const updated = [...templates];
      updated[index] = { ...updated[index], isFavorite, updatedAt: new Date().toISOString() };
      writeTemplates(updated);
    },

    async reorderTemplateDays(_userId, templateId, dayIds) {
      const templates = readTemplates();
      const index = templates.findIndex((template) => template.id === templateId);
      if (index === -1) return;
      const template = templates[index];
      const byId = new Map(template.days.map((day) => [day.id, day]));
      const reordered = dayIds
        .map((id) => byId.get(id))
        .filter((day): day is (typeof template.days)[number] => day !== undefined)
        .map((day, i) => ({ ...day, dayNumber: i }));
      if (reordered.length !== template.days.length) return;
      const updated = [...templates];
      updated[index] = { ...template, days: reordered, updatedAt: new Date().toISOString() };
      writeTemplates(updated);
    },

    async reorderTemplateExercises(_userId, templateDayId, exerciseIds) {
      const templates = readTemplates();
      const templateIndex = templates.findIndex((template) => template.days.some((day) => day.id === templateDayId));
      if (templateIndex === -1) return;
      const template = templates[templateIndex];
      const dayIndex = template.days.findIndex((day) => day.id === templateDayId);
      const day = template.days[dayIndex];
      const byId = new Map(day.exercises.map((exercise) => [exercise.id, exercise]));
      const reordered = exerciseIds
        .map((id) => byId.get(id))
        .filter((exercise): exercise is (typeof day.exercises)[number] => exercise !== undefined);
      if (reordered.length !== day.exercises.length) return;
      const days = [...template.days];
      days[dayIndex] = { ...day, exercises: reordered };
      const updated = [...templates];
      updated[templateIndex] = { ...template, days, updatedAt: new Date().toISOString() };
      writeTemplates(updated);
    },
  };
}
