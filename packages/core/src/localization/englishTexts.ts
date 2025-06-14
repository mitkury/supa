import type { Texts } from "./texts";

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
    apps: "Assistants",
  },

  messageForm: {
    placeholder: "Write a message...",
    attachFile: "Attach file",
    send: "Send message",
    stop: "Stop generation"
  },

  appPage: {
    title: "Assistants",
    buttonNewConfig: "New Assistant",
    chatsTitle: "Your Assistants",
    contactMessage: "An ability to create other types of apps is coming at some point. Write at <a class=\"anchor\" href=\"mailto:d@dkury.com\">d@dkury.com</a> if you have ideas or suggestions for an app."
  },

  appConfigPage: {
    newConfigTitle: "New Assistant",
    editConfigTitle: "Edit Assistant",
    defaultConfigTitle: "Default Assistant",
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
    tableCell: {
      deleteButton: "Delete",
      visibilityLabel: "Toggle assistant visibility in the sidebar",
      deleteLabel: "Delete app configuration"
    },
    defaultConfigMessage: "This is the configuration of the default chat assistant. You can change which AI model this assistant uses or create a new assistant.",
    defaultConfigGotoNew: "New assistant",
    description: "You can create your own system prompts (instructions) based on the default chat app. It will be possible to create other type of apps with tools and external APIs in future versions of t69."
  },

  appConfigDropdown: {
    placeholder: "Select an assistant..."
  },

  modelSelection: {
    manageProviders: "Manage model providers",
    done: "Done",
    backToSelection: "Back to selecting a model"
  },

  settingsPage: {
    title: "Settings",
    appearance: {
      title: "Appearance",
      theme: "Theme",
      language: "Language"
    },
    providers: {
      title: "Model Providers"
    },
    spaces: {
      title: "Spaces",
      spaceCount: (count: number) => `You have ${count === 1 ? '1 space' : `${count} spaces`}`,
      manageButton: "Manage"
    },
    developers: {
      title: "For developers",
      toggleDevMode: "Toggle Dev Mode"
    }
  },

  spacesPage: {
    title: "Your Spaces",
    description: "A space is where your AI apps and other data is stored. You can have multiple spaces and switch between them. For example, one can be for work and another personal.",
    opener: {
      createTitle: "Create a new space",
      createDescription: "Choose a folder for your new space. It could be local folder or a folder synced with iCloud, Dropbox, Google Drive, etc. Make sure the folder is empty.",
      createButton: "Create",
      openTitle: "Open a space",
      openDescription: "Open a folder that contains your space.",
      openButton: "Open",
      errorCreate: "Failed to create space",
      errorOpen: "Failed to open space",
      dialogCreateTitle: "Select a folder for a new space",
      dialogOpenTitle: "Select a folder with a space"
    }
  }
};
