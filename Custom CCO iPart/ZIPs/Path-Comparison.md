# ZIP / exported Content Type comparison

The `Blob` in each supplied export was decoded as UTF-8 XML. Its `DisplayHtmlPath` and `ConfigHtmlPath` were compared with exact archive entry names. Original evidence files have not been modified.

| Content Type | Exported file suffix after `.zip/` | Entry in supplied ZIP | Match |
|---|---|---|---|
| Hub Widgets display | `shims/hub-runtime-shim.html` | `shims/hub-runtime-shim.html` | Yes |
| Hub Widgets configure | `shims/hub-config-shim.html` | `shims/hub-config-shim.html` | Yes |
| Uhub CCO display | `display.html` | `UnionSuite-CCO/display.html` | **No** |
| Uhub CCO configure | `configure.html` | `UnionSuite-CCO/configure.html` | **No** |

Both use `~/iPartSource/` and native ClientSide display/config controls. The confirmed mismatch is the additional directory within the supplied CCO ZIP, not the shared upload location.

## Resolution confirmed by the user

The user changed the iMIS configuration to include the existing inner folder and confirmed configuration opens. Replacement builds in `../upload/UnionSuite-CCO.zip` preserve that layout and use:

```text
~/iPartSource/UnionSuite-CCO.zip/UnionSuite-CCO/display.html
~/iPartSource/UnionSuite-CCO.zip/UnionSuite-CCO/configure.html
```

Do not switch to a flat archive while retaining these nested paths. The assistant did not change live settings; the user made the correction. Opening configuration does not by itself verify save persistence, token substitution, API lookup or runtime rendering.
