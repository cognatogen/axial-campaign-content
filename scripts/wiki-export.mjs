import { WikiAPI } from "./wiki-api.mjs";
import { formatActor } from "./formatters/actor-formatter.mjs";
import { showExportDialog } from "./ui/export-dialog.mjs";

const MODULE_ID = "axial-campaign-content";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "wikiUrl", {
    name: game.i18n.localize("AXIAL_WIKI.Settings.WikiUrl.Name"),
    hint: game.i18n.localize("AXIAL_WIKI.Settings.WikiUrl.Hint"),
    scope: "world",
    config: true,
    type: String,
    default: "https://axialagescampaign.miraheze.org"
  });

  game.settings.register(MODULE_ID, "botUsername", {
    name: game.i18n.localize("AXIAL_WIKI.Settings.BotUsername.Name"),
    hint: game.i18n.localize("AXIAL_WIKI.Settings.BotUsername.Hint"),
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "botPassword", {
    name: game.i18n.localize("AXIAL_WIKI.Settings.BotPassword.Name"),
    hint: game.i18n.localize("AXIAL_WIKI.Settings.BotPassword.Hint"),
    scope: "world",
    config: true,
    type: String,
    default: ""
  });
});

Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  buttons.unshift({
    label: game.i18n.localize("AXIAL_WIKI.Button.Export"),
    class: "wiki-export",
    icon: "fas fa-globe",
    onclick: () => exportToWiki(sheet.document)
  });
});

Hooks.on("getItemSheetHeaderButtons", (sheet, buttons) => {
  buttons.unshift({
    label: game.i18n.localize("AXIAL_WIKI.Button.Export"),
    class: "wiki-export",
    icon: "fas fa-globe",
    onclick: () => exportToWiki(sheet.document)
  });
});

/**
 * Fetch the actor/item's avatar image as a Blob for wiki upload.
 */
async function fetchImageBlob(imgPath) {
  if (!imgPath) return null;
  try {
    // Strip query params (cache busters like ?1772778705102)
    const cleanPath = imgPath.split("?")[0];
    const resp = await fetch(cleanPath);
    if (!resp.ok) return null;
    return await resp.blob();
  } catch (err) {
    console.warn("Could not fetch image for wiki upload:", err.message);
    return null;
  }
}

/**
 * Derive a wiki-friendly filename from the actor name and image path.
 */
function getWikiImageFilename(name, imgPath) {
  if (!imgPath) return null;
  const cleanPath = imgPath.split("?")[0];
  const ext = cleanPath.split(".").pop() || "webp";
  const safeName = name.replace(/[^a-zA-Z0-9_ -]/g, "").replace(/\s+/g, "_");
  return `${safeName}.${ext}`;
}

async function exportToWiki(document) {
  const wikiUrl = game.settings.get(MODULE_ID, "wikiUrl");
  const botUsername = game.settings.get(MODULE_ID, "botUsername");
  const botPassword = game.settings.get(MODULE_ID, "botPassword");

  if (!wikiUrl || !botUsername || !botPassword) {
    ui.notifications.error(game.i18n.localize("AXIAL_WIKI.Notify.MissingSettings"));
    return;
  }

  // Determine image filename for wikitext reference
  const imageFilename = getWikiImageFilename(document.name, document.img);

  let formatted;
  if (document.type === "npc") {
    formatted = formatActor(document, imageFilename);
  } else {
    ui.notifications.warn(`Wiki export for type "${document.type}" is not yet supported.`);
    return;
  }

  const result = await showExportDialog(formatted.title, formatted.wikitext);
  if (!result) return;

  ui.notifications.info(game.i18n.localize("AXIAL_WIKI.Notify.Exporting"));

  try {
    // Fetch image blob for upload
    const imageBlob = await fetchImageBlob(document.img);

    const api = new WikiAPI(wikiUrl, botUsername, botPassword);
    await api.createOrUpdatePage(
      result.title,
      result.wikitext,
      `Exported ${document.name} from Foundry VTT`,
      imageBlob,
      imageFilename
    );
    ui.notifications.info(game.i18n.format("AXIAL_WIKI.Notify.Success", { name: result.title }));
  } catch (err) {
    console.error("Wiki export error:", err);
    ui.notifications.error(game.i18n.format("AXIAL_WIKI.Notify.Error", { error: err.message }));
  }
}
