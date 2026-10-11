# Task

## Goal

Let the user hide sexually explicit wording on websites they open in Chrome, for page text in Russian, Kazakh, and English, including pages that mix those languages. Matching words and phrases are masked so they are not readable. The rest of the page stays visible. Domain blocking and daily time limits stay as they are today.

This is a Chrome extension behavior. The Android app blocks domains over local VPN/DNS and cannot rewrite text inside Chrome or other apps.

## User Story

As a person using Website Blocker in Chrome, I want sexually explicit words and phrases on ordinary webpages to be unreadable in Russian, Kazakh, and English, so that I can browse without reading that wording, while normal sentences, the rest of the page, and my existing site blocks stay intact.

## Requirements

Adult wording means sexually explicit words and phrases. The task does not list those terms. Dictionaries are maintained as data, separate for Russian (`ru`), Kazakh (`kk`), and English (`en`). Russian and Kazakh entries include the common inflected forms those languages need. Kazakh entries include the common Cyrillic and Latin spellings of the same wording. English entries include common inflected forms (such as plural and verb forms) as data. Matching is case-insensitive. A match is a whole dictionary word or a full dictionary phrase, not a character sequence inside a longer unrelated word.

**What is hidden.** While the setting is on, each dictionary match in site-provided text the user can read is replaced by a mask. That includes text that appears after the first paint, text inside embedded frames on the page, and text alternatives the page exposes to assistive technology. Several matches in one sentence are each masked. Non-matching words between them stay as written. A “passage” is a contiguous dictionary phrase, not the surrounding paragraph, page, or domain.

**What stays visible.** All text that is not a dictionary match stays visible, including medical, educational, and news wording that is not clear adult wording. Images, video, and audio stay as the site rendered them. This feature does not classify pictures or video and does not read text painted inside images. Page layout, links, and controls remain usable. Text the user is currently typing in an editable field is not masked. The extension’s own popup, dashboard, blocked page, and unlock page are not masked. Browser-internal pages are not websites and are left alone.

**How a mask looks.** Each match is replaced by the same neutral, non-linguistic placeholder. The placeholder is visually distinct from ordinary text so the user can tell something was hidden. It does not contain the original wording, a letter scramble of it, or a hint that spells it. The original wording is not shown, not selectable, not copied to the clipboard from that span, and not announced by assistive technology. Neighboring unmatched text is unchanged. No control on the page reveals the original wording. Turning the setting off makes the original wording readable again on pages the user is viewing, without reinstalling the extension.

**Setting.** One global switch labeled as hiding adult wording, with a short description that it masks sexually explicit words and phrases on websites in Russian, Kazakh, and English. It is not a per-website rule and it is not a new website-blocking mode.

- Default is off for new installs and for existing saved settings that do not yet have the field.
- The switch lives on the dashboard Settings panel (`src/options/components/SettingsPanel.tsx`), with the other global switches. UI reads and writes settings only through `src/shared/storage.ts`.
- The popup (`src/popup`) has no global settings screen today. Do not add a second settings store or a duplicate global form there.
- The preview gallery (`src/preview`, `npm run preview`) renders the dashboard, so the same switch appears there.
- The switch is independent of `globalEnabled`, time tracking, and domain block or limit rules. Turning protection off does not change word hiding. Turning word hiding off does not change domain blocks.
- Import and export already round-trip global settings (`src/shared/import-export.ts`, backup version 1). A backup that includes the switch restores it. A backup that omits it leaves the switch off. Do not require a new backup version.

**Detection behavior.** Prefer masking wording the dictionaries classify as clear adult wording. Do not hide a whole sentence, paragraph, page, or domain because one match occurred. Languages other than `ru`, `kk`, and `en` are not a detection target; their text stays visible unless it contains a match from those three dictionaries. Mixed-language pages mask each match in any of the three languages.

**Relationship to existing blocking.** Domain and time-limit blocking stay redirect-based (`src/background/blocker.ts` and the navigation listeners described in the README). A blocked domain still redirects to the extension blocked page. This feature does not add an adult-domain category and does not change `matchesDomain()` rules.

**Privacy.** Dictionaries and matching stay on the device with the extension. Page text is not sent to a server. There is no account.

**Product truth.** The README remains the source of product truth. It must describe this setting, the three languages, and the honest limit that the Android app cannot hide in-page words. `.cursor/rules/architecture.md` lists Vue, Nuxt, and NestJS; that stack is not the shipped product and must not be introduced for this feature.

**Out of scope.** Image NSFW classification, video or audio classification, optical character recognition, domain-level adult categories, custom user word lists, click-to-reveal, accounts, and any backend. Mobile in-page hiding is out of scope because the app cannot do it.

## Acceptance Criteria

1. With the setting off, a page that contains adult wording in Russian, Kazakh, or English shows that wording unchanged, and domain blocking behavior is unchanged.
2. With the setting on, a visible dictionary match in Russian is replaced by the neutral placeholder. Unmatched words in the same sentence remain readable. The original match is not visible, not copied from that span, and not exposed to assistive technology.
3. The same is true for a Kazakh Cyrillic dictionary match and for the Latin spelling of that same Kazakh entry.
4. The same is true for an English dictionary match, including a common inflected form stored in the English dictionary data.
5. On one page whose text mixes Russian, Kazakh, and English, one match from each language is masked and the unmatched words around them stay readable.
6. The non-adult control sentence stays fully visible with the setting on: `The weather in Almaty is cold and the meeting starts at nine.` These non-adult sentences also stay fully visible: `Сегодня хорошая погода, и встреча начнётся в девять.` and `Бүгін ауа райы жақсы, жиналыс сағат тоғызда басталады.` and the mixed line `Today the meeting is in Almaty. Сегодня хорошая погода. Бүгін жиналыс бар.`
7. A dictionary word does not mask a longer unrelated word that merely contains those characters.
8. A multi-word dictionary phrase is masked as one span. One match does not mask the rest of the paragraph or redirect the tab.
9. Text inserted into the page after the first paint is masked while the setting stays on. Text the user is typing in an editable field is not masked. The popup, dashboard, blocked page, and unlock page are not masked.
10. The dashboard Settings panel shows the switch. It defaults to off. Turning it on and off persists across reopening the dashboard and follows `src/shared/storage.ts`. Export then import restores the chosen value. An older backup that lacks the field imports with the switch off.
11. Turning the master protection switch off, or adding and blocking a domain, does not by itself toggle adult-word hiding. Hiding adult wording does not create or remove website rules.
12. Turning the setting off makes previously masked wording readable again on an open page without reinstalling the extension.
13. Automated tests cover dictionary matching for `ru`, `kk`, and `en`, mixed-language text, inflected forms present in the data, the unrelated-word case, the control sentences above, the default-off setting, and import/export. Tests use fixtures; they do not require this task to list adult terms.
14. The Android app still only blocks configured domains. It does not claim to hide words inside Chrome or other apps.

## Backend

Does not apply. The shipped product has no NestJS service, database, or account API. Dictionaries are local extension data. Do not add a server so that page text or word lists can be synced.

## Frontend

Applies to the Chrome extension UI only. The extension is the React popup, dashboard, blocked page, and unlock page under `src/`. It is not a Vue or Nuxt app.

- Add the global switch to the existing dashboard Settings panel and persist it on `ExtensionSettings` through `src/shared/storage.ts` and the existing import/export path.
- Do not add a parallel settings UI in the popup.
- Leave blocked-page and unlock-page copy and behavior in place, except that those extension pages must not have their own text masked.
- The preview dashboard should show the new switch because it already renders the options app.

In-page masking is extension behavior on websites, not a change to the dashboard layout. How the extension observes page text is not specified here. Today it does not inject into pages (see Dependencies).

## Mobile

Does not apply as work to implement. `mobile/` is an Expo Android app. Phone-level blocking is a local VPN/DNS filter (`mobile/src/vpn/VpnFilter.ts`, `mobile/src/vpn/NATIVE.md`) that can only sinkhole configured hostnames. It cannot read or rewrite page text inside Chrome or any other app. Accessibility scraping is not an existing capability and must not be added for this feature. No mobile screen, setting, or VPN API change is required. Do not document the Android app as hiding adult words.

## QA

Verify on the Chrome extension. Use dictionary fixtures for adult matches and do not paste adult terms into bug reports; name the fixture id and language instead.

- **Setting off:** Russian, Kazakh, and English fixture matches stay fully readable. The control sentence `The weather in Almaty is cold and the meeting starts at nine.` stays fully readable.
- **Russian:** Setting on. A page whose visible text includes a Russian fixture match masks only that match. The sentence `Сегодня хорошая погода, и встреча начнётся в девять.` stays fully visible.
- **Kazakh:** Setting on. Mask a Cyrillic fixture match and the Latin spelling of the same entry. The sentence `Бүгін ауа райы жақсы, жиналыс сағат тоғызда басталады.` stays fully visible.
- **English:** Setting on. Mask an English fixture match and one inflected form stored for that entry. The Almaty weather sentence stays fully visible.
- **Mixed page:** One Russian fixture match, one Kazakh fixture match, and one English fixture match on the same page are all masked. Unmatched words on that page stay readable. The mixed non-adult line `Today the meeting is in Almaty. Сегодня хорошая погода. Бүгін жиналыс бар.` stays fully visible.
- **False positive check:** A longer unrelated word that only contains a dictionary character sequence stays visible. A medical, educational, or news sentence that is not a dictionary match stays visible. One match does not blank the page and does not redirect to the blocked page.
- **Mask quality:** The placeholder is the same for every match, does not spell the original wording, and copying that span does not yield the original wording.
- **Dynamic text:** A fixture match added to the page after load is masked without a manual reload. Typing the same wording into an editable field is not masked.
- **Extension UI:** Popup, dashboard, blocked page, and unlock page text stay readable with the setting on.
- **Persistence:** Switch defaults off, survives restart, and round-trips through export/import. An old backup without the field stays off.
- **Isolation:** With protection off and adult-word hiding on, fixture matches are still masked and no domain is newly blocked. With adult-word hiding off and a domain set to block, that domain still redirects to the blocked page and page text elsewhere is not masked.
- **Toggle off:** Masked wording on an open page becomes readable again after the switch is turned off.
- **Automated:** `npm run test` covers the matcher and settings cases in Acceptance Criterion 13.
- **Android:** Confirm only that the app still blocks listed domains and that no screen claims in-page word hiding. No in-browser word check on the phone.

## Dependencies

- Page text can be hidden only if the extension gains a way to observe website content. It does not have that today. The manifest has no content scripts and does not request `<all_urls>`. The README states that blocking is a tab redirect to the extension blocked page, using `tabs` and `webNavigation`, not page injection. Shipping this feature depends on adding that observation capability. This task does not choose the mechanism.
- Existing domain blocking, time limits, trusted unlock, and `src/shared/storage.ts` stay the settings and enforcement path. Do not duplicate them.
- Dictionary data for `ru`, `kk`, and `en`, including required inflections and both Kazakh scripts, must exist as extension data before QA can run the fixture checks.
- README must be updated so product truth matches the setting and the mobile limitation.
- Vitest is the existing test runner (`npm run test`). New tests belong there.
- No backend, account, or hosted dictionary service.
- No Android native module, VPN change, or Play Store capability.

## Risks

- **No page access today.** Until the extension can observe page content, in-page hiding cannot work. Implementing that access widens what the extension can read compared with the current redirect-only model. Scope that access to this feature and keep domain blocking redirect-based.
- **False positives.** Medical, educational, and news text may share words with adult wording. Expected behavior is to mask only clear dictionary matches, not whole pages. Ambiguous non-sexual wording must stay out of the dictionaries.
- **False negatives.** Inflected Russian and Kazakh, Latin Kazakh, mixed-language pages, and wording added after load will be missed if the dictionaries or the page observation are incomplete. Obfuscated spelling, images of text, and languages other than `ru`, `kk`, and `en` are accepted misses.
- **Bypass.** A determined user can turn the setting off or disable the extension. The README already states that limit for site blocking. There is no click-to-reveal on the page.
- **Mobile gap.** Users may expect the Android VPN app to hide words inside Chrome on the phone. It cannot. Domain blocking on the phone remains a separate, coarser control.
- **Stale architecture rule.** Following `.cursor/rules/architecture.md` would introduce Vue, Nuxt, and NestJS, which this repo does not ship. That would duplicate the extension instead of extending it.
- **Backup compatibility.** Existing version-1 backups have no field for this switch. They must import as off so an upgrade does not start masking pages unexpectedly.
