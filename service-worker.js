// Open PUML in a full browser tab instead of a small popup.
chrome.action.onClicked.addListener(async () => {
  const appUrl = chrome.runtime.getURL("app.html");
  const tabs = await chrome.tabs.query({ url: appUrl });

  if (tabs.length > 0 && tabs[0].id !== undefined) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    return;
  }

  await chrome.tabs.create({ url: appUrl });
});