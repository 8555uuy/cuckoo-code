/**
 * 把一段文本送进 AI 页面输入框并发送（复刻 overlay/chat-input.ts）。
 */
function buildInjectCode(msg) {
  const payload = JSON.stringify(String(msg));
  return '(function () {\n' +
    '  var MSG = ' + payload + ';\n' +
    '  function visible(el) { try { var s = getComputedStyle(el); return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0"; } catch (e) { return false; } }\n' +
    '  function findInput() {\n' +
    '    var tas = document.querySelectorAll("textarea");\n' +
    '    for (var i = 0; i < tas.length; i++) { if (visible(tas[i])) return tas[i]; }\n' +
    '    var ed = document.querySelector(\'div[contenteditable="true"], [role="textbox"]\');\n' +
    '    if (ed && visible(ed)) return ed;\n' +
    '    return null;\n' +
    '  }\n' +
    '  function setContent(input, msg) {\n' +
    '    try {\n' +
    '      if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {\n' +
    '        input.focus();\n' +
    '        var proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;\n' +
    '        var setter = Object.getOwnPropertyDescriptor(proto, "value").set;\n' +
    '        setter.call(input, msg);\n' +
    '        input.dispatchEvent(new Event("input", { bubbles: true }));\n' +
    '        return true;\n' +
    '      }\n' +
    '      if (input.isContentEditable || input.getAttribute("contenteditable") === "true") {\n' +
    '        input.focus();\n' +
    '        document.execCommand("selectAll", false, undefined);\n' +
    '        document.execCommand("delete", false, undefined);\n' +
    '        var dt = new DataTransfer(); dt.setData("text/plain", msg);\n' +
    '        input.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt }));\n' +
    '        return true;\n' +
    '      }\n' +
    '    } catch (e) {}\n' +
    '    return false;\n' +
    '  }\n' +
    '  function triggerSend(input) {\n' +
    '    var opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true, isComposing: false };\n' +
    '    input.dispatchEvent(new KeyboardEvent("keydown", opts));\n' +
    '    input.dispatchEvent(new KeyboardEvent("keypress", opts));\n' +
    '    input.dispatchEvent(new KeyboardEvent("keyup", opts));\n' +
    '  }\n' +
    '  var input = findInput();\n' +
    '  if (!input) return "NO_INPUT";\n' +
    '  if (!setContent(input, MSG)) return "SET_FAILED";\n' +
    '  setTimeout(function () { triggerSend(input); }, 400);\n' +
    '  return "SENT";\n' +
    '})();';
}
module.exports = { buildInjectCode: buildInjectCode };
