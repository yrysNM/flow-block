# Synchronization

Not implemented.

The intended end state is one Task and one account for the web app, the FocusFlow extension, and later the phone app. Writes happen on the server. Clients refetch or receive the saved row. Drag and drop, when it exists, must update urgency, importance, or status on the server using the same rules as the form.

Today:

- The web app reads and writes the API after each save and then reloads the list
- `apps/extension` has no network sync
- The Website Blocker stores rules in `chrome.storage`
- The Expo app stores rules in AsyncStorage

There is no offline queue and no conflict policy yet.
