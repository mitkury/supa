import { ModelProviderCloudConfig } from "../../shared/models.ts";
import { ModelProviderConfig } from "../../shared/models.ts";
import { validateKey } from "../tools/providerKeyValidators.ts";
import { getCloudProviderModels } from "../tools/providerModels.ts";
import { BackServices } from "./backServices.ts";

export function providersController(services: BackServices) {
  const router = services.router;

  router
    .onGet("provider-configs/:providerId", async (ctx) => {
      if (services.db === null) {
        ctx.error = services.getDbNotSetupError();
        return;
      }

      const providerId = ctx.params.providerId;

      const provider = await services.db.getProviderConfig(providerId);

      if (provider === null) {
        ctx.error = "Provider not found";
        return;
      }

      ctx.response = provider;
    })
    .onPost("provider-configs/:providerId/validate", async (ctx) => {
      if (services.db === null) {
        ctx.error = services.getDbNotSetupError();
        return;
      }

      const providerId = ctx.params.providerId;

      const provider = await services.db.getProviderConfig(providerId);

      if (provider === null) {
        ctx.response = false;
        return;
      }

      if (provider.type === 'cloud') {
        const cloudConfig = provider as ModelProviderCloudConfig;
        const keyIsValid = await validateKey(providerId, cloudConfig.apiKey);
  
        ctx.response = keyIsValid;
      } else {
        // @TODO: check if the endpoint is alive
        ctx.response = true;
      }
    })
    .onGet("provider-configs/:providerId/models", async (ctx) => {
      if (services.db === null) {
        ctx.error = services.getDbNotSetupError();
        return;
      }

      const providerId = ctx.params.providerId;

      const provider = await services.db.getProviderConfig(providerId);

      if (provider === null) {
        ctx.error = "Provider not found";
        return;
      }

      if (provider.type !== 'cloud') {
        ctx.data = [];
        return;
      }

      const models = await getCloudProviderModels(providerId, provider.apiKey);

      ctx.response = models;
    })
    .onGet("provider-configs", async (ctx) => {
      if (services.db === null) {
        ctx.error = services.getDbNotSetupError();
        return;
      }

      const providers = await services.db.getModelProviders();

      ctx.response = providers;
    })
    .onPost("provider-configs", async (ctx) => {
      if (services.db === null) {
        ctx.error = services.getDbNotSetupError();
        return;
      }

      const provider = ctx.data as ModelProviderConfig;

      const newProvider = await services.db.insertProviderConfig(provider);

      ctx.response = newProvider;

      router.broadcast(ctx.route, newProvider);
    })
    .onDelete("provider-configs/:providerId", async (ctx) => {
      if (services.db === null) {
        ctx.error = services.getDbNotSetupError();
        return;
      }

      const providerId = ctx.params.providerId;

      const provider = await services.db.getProviderConfig(providerId);

      if (provider === null) {
        ctx.error = "Provider not found";
        return;
      }

      await services.db.deleteProviderConfig(providerId);

      ctx.response = true;

      router.broadcast(ctx.route, provider);
    })
    .onPost("validate-key/:provider", async (ctx) => {
      const provider = ctx.params.provider;
      const key = ctx.data as string;
      const keyIsValid = await validateKey(provider, key);
      ctx.response = keyIsValid;
    })
}