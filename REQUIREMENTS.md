# SpeedyPeng — Base Requirements

These requirements apply to every session and every change in this project.

---

## 1. localStorage Backward Compatibility

**Rule:** The localStorage data structure must always be backward-compatible. Existing users upgrading to a new version must not lose their data or encounter broken state.

### How it works today

- State is persisted under the key `STATE_KEY` (currently `'speedypeng_v3'`).
- On load, saved data is merged over `defaultState` via `{ ...defaultState, ...JSON.parse(s) }`.
- This means **any field present in `defaultState` but absent in saved data gets the default value automatically**.

### Rules for every change

1. **Never remove a field from `defaultState`.** Removing a field breaks saves that still carry the old value or causes undefined behavior when code references it. Mark unused fields as deprecated in a comment instead, and remove only after a deliberate migration cycle.

2. **Never rename an existing field.** Renaming is equivalent to removing the old field and adding a new one — existing saves lose the old value. If a rename is truly necessary, read both old and new keys during migration and delete the old key after copying.

3. **Only add new fields to `defaultState`.** New fields are safe because the spread merge fills them in for existing users automatically.

4. **New fields must have a safe default.** The default must make the game behave correctly for a user who has never seen this field (e.g., `false`, `0`, `''`, `[]`, `{}`). Never use `null` or `undefined` as a default unless the rest of the code explicitly handles those values.

5. **Do not change the type of an existing field.** If a field was a `number`, keep it a `number`. Type changes corrupt existing saves. If a new type is needed, add a new field.

6. **Bumping `STATE_KEY` is a last resort.** Changing the key (e.g., `'speedypeng_v4'`) wipes all existing saves for users. Only do this when a breaking schema change is unavoidable AND there is an explicit migration plan that reads the old key, transforms the data, writes to the new key, and removes the old key.

### Migration pattern (when needed)

If a field must be transformed (not just added), do it inside `loadState()` before returning:

```js
function loadState() {
  try {
    const s = localStorage.getItem(STATE_KEY);
    if (s) {
      const saved = JSON.parse(s);
      // Example migration: rename oldField → newField
      if ('oldField' in saved && !('newField' in saved)) {
        saved.newField = saved.oldField;
        delete saved.oldField;
      }
      return { ...defaultState, ...saved };
    }
  } catch {}
  return { ...defaultState };
}
```

Migrations must be **idempotent** — running them twice must produce the same result.

---

## 2. Summary

| Action | Allowed? |
|---|---|
| Add a new field to `defaultState` with a safe default | Yes |
| Remove a field from `defaultState` | No |
| Rename an existing field | No (use migration) |
| Change the type of an existing field | No (add a new field) |
| Change `STATE_KEY` without migration | No |
| Change `STATE_KEY` with a full read-transform-write migration | Only as last resort |
