# Current work

**Feature:** F07 – Categories
**Status:** in progress
**Started:** 2026-08-21

## Goal

Fixed costs need something to be sorted by. The twelve seeded categories become
manageable: rename any of them, add your own with an icon, remove the ones you added.

## Scope

- In: the category service, an icon set with a picker, and a category section on the
  settings page. Seeded categories can be renamed but not removed; a removed category
  leaves its expenses intact and simply uncategorised.
- Out: assigning categories to expenses — that arrives with the expenses themselves (F08).

## Plan

- [ ] `server/services/categories.ts` with tests
- [ ] `components/ui/category-icon.tsx`: an explicit icon map, so the bundle carries the
      icons we use rather than all of lucide
- [ ] Category management on `/einstellungen`: list, add, rename, remove with undo
- [ ] German copy
- [ ] Verified by screenshot at 375 px and desktop
- [ ] `npm run check` passes

## Notes / decisions

- Seeded categories are renameable but not removable. They are what the fixed-cost form
  offers by default, and an empty category list would make that form unusable.
- Removing a custom category is a real delete, not a retirement: the schema already sets
  `expense.category_id` to null on delete, so nothing is lost except the label.

## Resume here

If interrupted: `npm run test` covers the service; the UI is unfinished if
`/einstellungen` shows no category section.
