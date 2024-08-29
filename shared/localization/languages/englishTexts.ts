import type { Texts } from "../texts";

export const englishTexts: Texts = {
  basics: {
    name: "Name",
    button: "Button",
    description: "Description",
    instructions: "Instructions",
    optional: "Optional",
    loading: "Loading...",
    thinking: "Thinking...",
    model: "Model",
  },

  appPage: {
    title: "Apps",
    buttonNewConfig: "New Chat Config",
  },

  appConfigPage: {
    newConfigTitle: "New Chat Config",
    editConfigTitle: "Edit Chat Config",
    defaultConfigTitle: "Default Chat Config",
    newConfigButton: "New thread button (optional)",
    buttonCreate: "Create",
    buttonSave: "Save Changes",
    namePlaceholder: "Name your app",
    descriptionPlaceholder: "A short description of what this app does",
    instructionsPlaceholder:
      "Start with 'You are a ...'. Instruct the AI as if you were writing an instruction for a new employee",
    buttonPlaceholder: "A short actionable text for a button",
    gotoNewConfig: "Go here if you want to create a new chat config",
    errorValidationRequired: "This field is required",
    errorAppConfigLoadFailure: "Failed to load app config",
  },

  settingsPage: {
    title: "Settings",
  }
};
