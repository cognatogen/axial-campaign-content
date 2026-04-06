/**
 * Show a dialog for previewing and editing wikitext before export.
 * Returns { title, wikitext } on confirm, or null on cancel.
 */
export function showExportDialog(defaultTitle, defaultWikitext) {
  return new Promise((resolve) => {
    const dialogContent = `
      <form class="axial-wiki-export-dialog">
        <div class="form-group">
          <label>${game.i18n.localize("AXIAL_WIKI.Dialog.PageTitle")}</label>
          <input type="text" name="pageTitle" value="${defaultTitle.replace(/"/g, "&quot;")}" />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("AXIAL_WIKI.Dialog.Preview")}</label>
          <textarea name="wikitext">${defaultWikitext.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
        </div>
      </form>
    `;

    new Dialog({
      title: game.i18n.localize("AXIAL_WIKI.Dialog.Title"),
      content: dialogContent,
      buttons: {
        export: {
          icon: '<i class="fas fa-globe"></i>',
          label: game.i18n.localize("AXIAL_WIKI.Dialog.Export"),
          callback: (html) => {
            const title = html.find('[name="pageTitle"]').val();
            const wikitext = html.find('[name="wikitext"]').val();
            resolve({ title, wikitext });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("AXIAL_WIKI.Dialog.Cancel"),
          callback: () => resolve(null)
        }
      },
      default: "export",
      close: () => resolve(null),
      render: (html) => {
        // Set dialog width for comfortable editing
        html.closest(".dialog").css("width", "600px");
      }
    }).render(true);
  });
}
