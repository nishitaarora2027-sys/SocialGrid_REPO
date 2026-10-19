# SocialGrid design principles

How the public site (landing + login) is designed, and why. Inspired by how Apple builds
product pages and macOS. Use this before changing anything visual.

## 1. One idea per screen
Every section says one thing in one big headline and one supporting sentence.
If a section needs two headlines, it is two sections.

## 2. The product is the picture
No stock photos or illustrations. The hero image is the real chat on a phone, and the
"work" section is posts. Colour comes from the posts, not from the page.

## 3. Ink & Sunset: quiet canvas, one accent
Warm paper (#FAF7F2) and near-black ink (#17140F). Ink is the action colour: buttons,
links, the user's own chat bubbles. The only colour is the sunset
(#FFB13B → #FF5E62 → #C2338B): the highlighted post in the logo, the second line of
headlines, the "ready" moment, unread badges. Small accent text uses solid --sun (#D93D4A).
Chosen after research (Oct 2026): calm neutral base + one saturated signature accent is the
2026 brand direction; warm sunset tones tie to Instagram and Indian festive golden hour;
monochrome marks are the Apple way. In dark mode ink and cream swap. The dark "work" section
exists only to make the posts glow.

## 4. Glass is for controls, never content
Translucent, blurred surfaces are used only for things that float above the page:
the nav bar and the login card. Content cards are solid.

## 5. Type does the work
Mukta for English and Hindi. Headlines are large, bold and tightly spaced (`.display`);
body is 17–22px with relaxed line height. Hindi gets more line height.

## 6. Login is a utility
Modelled on the macOS login screen: one soft colour wallpaper, one glass card, one task.
The team login is a quiet text link inside the card, not a competing button.

## 7. Motion explains, then stops
Sections fade up once as they scroll into view. Nothing loops. Content is visible without
JavaScript, and people who ask for reduced motion see no animation.

## 8. Honest content
Sample posts are labelled as samples. No made-up numbers, reviews or client logos.
We say "create and plan", never "we post for you". No list of business types.
