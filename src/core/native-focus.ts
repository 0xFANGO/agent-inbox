/** Native AX attributes retain CFURL values that System Events cannot serialize. */
export function nativeFocusScript(bundleId: string): string {
  return `
ObjC.import("AppKit");
ObjC.import("ApplicationServices");
ObjC.bindFunction("AXUIElementCreateApplication", ["id", ["int"]]);
ObjC.bindFunction("AXUIElementCopyAttributeValue", ["int", ["id", "id", "id*"]]);
ObjC.bindFunction("CFGetTypeID", ["unsigned long", ["id"]]);
ObjC.bindFunction("CFURLGetTypeID", ["unsigned long", []]);
ObjC.bindFunction("CFURLGetString", ["id", ["id"]]);
const bundle = ${JSON.stringify(bundleId)};
function attribute(node, name) {
  const value = Ref();
  const error = $.AXUIElementCopyAttributeValue(node, $(name), value);
  if (error === -25211) throw new Error("AX_ACCESS_DENIED");
  return error === 0 ? value[0] : null;
}
function text(value) {
  if (!value) return "";
  if ($.CFGetTypeID(value) === $.CFURLGetTypeID()) return String(ObjC.unwrap($.CFURLGetString(value)));
  const unwrapped = ObjC.unwrap(value);
  return typeof unwrapped === "string" ? unwrapped : "";
}
function readWindow() {
  const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier($(bundle));
  if (!apps.count) return null;
  const app = $.AXUIElementCreateApplication(apps.objectAtIndex(0).processIdentifier);
  const window = attribute(app, "AXFocusedWindow");
  if (!window) return null;
  let result = { title: text(attribute(window, "AXTitle")), url: text(attribute(window, "AXDocument")) };
  const queue = [{ node: window, depth: 0 }];
  let visited = 0;
  while (queue.length && visited++ < 80) {
    const item = queue.shift();
    if (text(attribute(item.node, "AXRole")) === "AXWebArea") {
      const url = text(attribute(item.node, "AXURL"));
      const title = text(attribute(item.node, "AXTitle"));
      if (bundle === "com.anthropic.claudefordesktop" && (url.startsWith("file:") || (!url && !title))) continue;
      return { title: title || result.title, url: url || result.url };
    }
    if (item.depth < 8) {
      const children = attribute(item.node, "AXChildren");
      if (children) for (let i = 0; i < children.count && queue.length < 80; i++) queue.push({ node: children.objectAtIndex(i), depth: item.depth + 1 });
    }
  }
  return result;
}
JSON.stringify(readWindow());
`;
}
