const version = document.querySelector('#version')
const manifest = chrome.runtime.getManifest()
if (version) version.textContent = `Version ${manifest.version}`
