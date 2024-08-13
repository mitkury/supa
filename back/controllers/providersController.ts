import { ModelProviderCloudConfig } from "@shared/models.ts";
import { ModelProviderConfig } from "@shared/models.ts";
import { validateKey } from "../tools/providerKeyValidators.ts";
import { getProviderModels } from "../tools/providerModels.ts";
import { BackServices } from "./backServices.ts";
import { providers } from "../providers.ts";
import { apiRoutes } from "@shared/apiRoutes.ts";

export function providersController(services: BackServices) {
  const router = services.router;

  router
    .onGet(apiRoutes.providers(), (ctx) => {
      ctx.response = providers;
    })
    .onGet(apiRoutes.provider(), (ctx) => {
      const providerId = ctx.params.providerId;

      const provider = providers.find((p) => p.id === providerId);

      if (provider === undefined) {
        ctx.error = "Provider not found";
        return;
      }

      ctx.response = provider;
    })
    .onGet(apiRoutes.providerConfig(), async (ctx) => {
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
    .onPost(apiRoutes.validateProviderConfig(), async (ctx) => {
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

      if (provider.type === "cloud") {
        const cloudConfig = provider as ModelProviderCloudConfig;
        const keyIsValid = await validateKey(providerId, cloudConfig.apiKey);

        ctx.response = keyIsValid;
      } else {
        // @TODO: check if the endpoint is alive
        ctx.response = true;
      }
    })
    .onGet(apiRoutes.providerModel(), async (ctx) => {
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

      if (provider.type !== "cloud") {
        const models = await getProviderModels(providerId, "");
        ctx.response = models;
        return;
      }

      const models = await getProviderModels(providerId, provider.apiKey);
      ctx.response = models;
    })
    .onGet(apiRoutes.providerConfigs(), async (ctx) => {
      if (services.db === null) {
        ctx.error = services.getDbNotSetupError();
        return;
      }

      const providers = await services.db.getModelProviders();

      ctx.response = providers;
    })
    .onPost(apiRoutes.providerConfigs(), async (ctx) => {
      if (services.db === null) {
        ctx.error = services.getDbNotSetupError();
        return;
      }

      const provider = ctx.data as ModelProviderConfig;

      const newProvider = await services.db.insertProviderConfig(provider);

      ctx.response = newProvider;

      router.broadcastPost(ctx.route, newProvider);
    })
    .onDelete(apiRoutes.providerConfig(), async (ctx) => {
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

      router.broadcastPost(ctx.route, provider);
    })
    .onPost(apiRoutes.validateProviderKey(), async (ctx) => {
      const provider = ctx.params.provider;
      const key = ctx.data as string;
      const keyIsValid = await validateKey(provider, key);
      ctx.response = keyIsValid;
    });
}
