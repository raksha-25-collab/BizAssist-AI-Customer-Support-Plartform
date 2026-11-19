---
name: Warm Kinetic Intelligence
colors:
  surface: '#fbf8ff'
  surface-dim: '#dbd9e1'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fb'
  surface-container: '#efecf5'
  surface-container-high: '#eae7ef'
  surface-container-highest: '#e4e1ea'
  on-surface: '#1b1b21'
  on-surface-variant: '#5c4039'
  inverse-surface: '#303036'
  inverse-on-surface: '#f2eff8'
  outline: '#906f68'
  outline-variant: '#e5beb5'
  surface-tint: '#b52700'
  primary: '#b02600'
  on-primary: '#ffffff'
  primary-container: '#da3609'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a2'
  secondary: '#aa314d'
  on-secondary: '#ffffff'
  secondary-container: '#fc708a'
  on-secondary-container: '#700026'
  tertiary: '#8e4457'
  on-tertiary: '#ffffff'
  tertiary-container: '#ac5c6f'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a2'
  on-primary-fixed: '#3d0700'
  on-primary-fixed-variant: '#8a1c00'
  secondary-fixed: '#ffd9dd'
  secondary-fixed-dim: '#ffb2bc'
  on-secondary-fixed: '#400012'
  on-secondary-fixed-variant: '#891736'
  tertiary-fixed: '#ffd9df'
  tertiary-fixed-dim: '#ffb1c1'
  on-tertiary-fixed: '#3d0418'
  on-tertiary-fixed-variant: '#743042'
  background: '#fbf8ff'
  on-background: '#1b1b21'
  surface-variant: '#e4e1ea'
typography:
  display-lg:
    fontFamily: Syne
    fontSize: 38px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-md:
    fontFamily: Syne
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Bricolage Grotesque
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  stat-metric:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Bricolage Grotesque
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

This design system drives a premium, multi-tenant mobile platform catering to three synchronized perspectives: the Customer seeking immediate clarity, the Support Specialist handling complex resolution flows, and the Admin monitoring systemic health.

The aesthetic fuses **Warm Editorial Modernism** with dynamic, human-centric intelligence. Moving away from the sterile, clinical tropes of typical enterprise customer support software, the interface leverages rich, grounded tactile warmth paired with punchy, high-energy accents. 

### Key Characteristics
- **Warm Architectural Grounding:** Tactile ivory foundations and soft cream substrates eliminate digital glare, evoking high-end editorial stationary and thoughtful hospitality.
- **Vibrant Intentionality:** Energetic orange-red and expressive rose accents guide action decisively, turning routine customer management into an engaging, fluid experience.
- **Expressive Human Energy:** Striking typographic counterpoints between sculptural geometry, idiosyncratic modern grotesque, and utilitarian body text present AI not as an unfeeling automaton, but as a calibrated, responsive partner.

## Colors

The palette relies on high chromatic contrast anchored against soft, natural tones.

### Color Tokens & Roles
- **Canvas Base (`#EBE9E1`):** Warm Ivory canvas serving as the default foundation for screen backgrounds.
- **Card Substrates (`#FFFFFF`, `#F7F6F2`):** Crisp pure white for primary interactive cards; soft warm cream for secondary contextual containers and nested groupings.
- **Primary Accent (`#E43D12`):** Kinetic Orange-Red reserved for primary actions, key state triggers, and active notification pips.
- **Secondary Accent (`#D6536D`):** Rich Rose Pink applied to secondary highlights, interactive pill toggles, and user avatar badges.
- **Tertiary Accent (`#FFA2B6`):** Soft Blossom Pink used for conversational message bubbles, subtle tag backgrounds, and secondary focus states.
- **Status & Warning (`#EFB11D`):** Warm Golden Amber for triage alerts, priority tickets, and pending status chips.
- **Deep Text & Icons (`#1E1E24`):** Rich Charcoal Slate for high-legibility typographic hierarchy and primary iconography.
- **Subdued Text (`#686660`):** Muted umber slate for secondary metadata and timestamps.
- **Structural Dividers (`#E4DFD7`):** Hairline borders defining card envelopes and list separations.

## Typography

The typographic hierarchy uses a triad of specialized typefaces:

1. **Syne (Display):** Bold, sculptural, and expressive. Reserved for hero moments, high-level dashboards, role transition headers, and key AI feature entrances.
2. **Bricolage Grotesque (Section Titles & Numerical Metrics):** Energetic, distinctive, and functional. Powers ticket metrics, KPI counters, workflow state headers, and system labels.
3. **Inter (Body & Inputs):** Uncompromising clarity. Drives conversational chat bubbles, ticket timelines, form fields, and dense operational data.

## Layout & Spacing

A mobile-first, vertical rhythm tailored for thumb-driven task management across Customer, Staff, and Admin roles.

### Layout Rules
- **Canvas Margins:** Fixed `24px` (`1.5rem`) outer screen margins anchor the viewport, establishing generous breathing room against device bezels.
- **Card Enclosures:** Core modules and cards utilize a default interior padding of `20px` (`space-lg`), ensuring actionable content avoids visual crowding.
- **Vertical Stack Rhythm:** Standard separation between vertical feed cards and sections is `16px` (`space-md`). Dense metadata pairs use `8px` (`space-sm`), while micro tags maintain `4px` (`space-xs`) spacing.
- **Responsive Adaptations:** 
  - *Mobile (<600px):* Single-column flow with persistent sticky bottom action bars for high-frequency actions (Reply, Reassign, Escalate).
  - *Tablet (600px–1024px):* Split master-detail grid with dynamic multi-pane views (ticket list on left, real-time resolution workspace on right).

## Elevation & Depth

Visual hierarchy pairs tonal contrast with warm ambient diffusion rather than heavy artificial shadows.

### Depth Mechanics
- **Base Canvas:** Flat warm ivory (`#EBE9E1`).
- **Primary Surfaces:** Pure white cards (`#FFFFFF`) framed with a subtle `1px` structural outline (`#E4DFD7`) and a warm ambient drop shadow: `0 8px 24px -4px rgba(30, 30, 36, 0.04), 0 2px 6px -1px rgba(30, 30, 36, 0.02)`.
- **Secondary Surfaces:** Soft warm cream containers (`#F7F6F2`) nested within white cards, or placed directly on the base canvas without borders for softer grouping.
- **Floating Modals & Sheets:** Elevated navigation drawers, triage sheets, and action drawers leverage high-diffusion depth: `0 16px 36px -6px rgba(30, 30, 36, 0.08)`, paired with a tinted backdrop scrim (`rgba(30, 30, 36, 0.35)` with `8px` backdrop blur).

## Shapes

The interface embraces a friendly, confident curvature that mirrors modern industrial hardware.

### Corner Radius Standards
- **Outer Shells & Cards:** `16px` to `24px` (`rounded-lg` to `rounded-xl`). Cards with primary content default to `20px`.
- **Pills & Interactive Badges:** Fully circular (`rounded-full` / `9999px`) for status tags, metric chips, filter buttons, and role indicators.
- **Input Fields & Text Areas:** `12px` to `16px` radius, providing a tactile, pillowed touch target for mobile fingertips.
- **Avatars & AI Indicator Nodes:** Circular or soft-squircle containers with subtle interior ring offsets.

## Components

### Buttons & Interactive Controls
- **Primary Button:** Bold orange-red background (`#E43D12`), white text (`#FFFFFF`) in Bricolage Grotesque medium, fully rounded pill (`9999px`) or `16px` radius. Height `52px` on mobile for effortless reach.
- **Secondary Button:** Soft warm cream background (`#F7F6F2`), charcoal text (`#1E1E24`), subtle `1px` border (`#E4DFD7`).
- **Accent Action:** Rose pink button (`#D6536D`) reserved for high-value AI suggestion approvals and secondary workflow resolutions.

### Status Chips & Priority Badges
- **Warning / Pending:** Amber surface (`rgba(239, 177, 29, 0.14)`), deep amber text (`#9E6F06`), amber indicator dot (`#EFB11D`).
- **Urgent / Escalated:** Red-orange surface (`rgba(228, 61, 18, 0.12)`), solid primary accent text (`#E43D12`).
- **Resolved / Normal:** Charcoal tinted slate with neutral border.

### Chat & Message Bubbles
- **Customer Bubble:** Pure white background (`#FFFFFF`), `1px` border (`#E4DFD7`), `16px` radius with `4px` corner anchor.
- **AI / Staff Copilot Bubble:** Soft blossom tint (`#FFA2B6` at 18% opacity or solid soft pink accent), charcoal body text, paired with a small Syne-styled badge indicating confidence level.

### Input Fields & Controls
- **Text Inputs:** Height `52px`, warm cream fill (`#F7F6F2`), border (`#E4DFD7`). Focus transition illuminates border in solid charcoal (`#1E1E24`) or primary orange-red (`#E43D12`) with a subtle `2px` ring.
- **Selection Toggles:** Custom rounded switch tracks with smooth slide animations, shifting from muted sand to bold orange-red on activation.

### Cards & Feed Tiles
- Structural boundary defined by `#E4DFD7` border, `20px` internal padding, containing Bricolage Grotesque titles and Inter metadata.
- Metric cards showcase oversized numbers (`stat-metric`) alongside micro-trend indicators.