const params = new URLSearchParams(window.location.search)
const host = params.get('host') || 'This site'
const label = document.querySelector('#host')
if (label) label.textContent = host
