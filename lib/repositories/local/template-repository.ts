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
  };
}
