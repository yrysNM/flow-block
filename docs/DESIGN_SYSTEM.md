# Design system

Implemented as Tailwind v4 tokens in `apps/web/app/assets/css/main.css`, plus the app shell. This is the product UI, not a mockup page.

| Token | Hex | Tailwind |
| --- | --- | --- |
| Primary | `#0055FA` | `bg-primary`, `text-primary` |
| Background | `#F5F7FA` | `bg-background` |
| Surface | `#FFFFFF` | `bg-surface` |
| Text | `#172033` | `text-ink` |
| Secondary | `#64748B` | `text-secondary` |
| Success | `#16A36A` | `text-success` |
| Warning | `#E89A26` | `bg-warning` |
| Danger | `#DC4C4C` | `text-danger` |
| Border | `#E5EAF1` | `border-line` |

Type is Outfit. Cards use a 14px radius and a soft shadow (`shadow-card`). Inputs use a slightly tighter radius. Status chips are pills.

Body text uses `#172033` on `#F5F7FA` or white. Primary buttons use white text on `#0055FA`. Secondary `#64748B` is for labels and hints, not for long paragraphs.

The shell is a sidebar, a top bar (title, name, log out), and a content column capped at `max-w-6xl`.
