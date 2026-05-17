document.getElementById("save").addEventListener("click", () => {
  const fromPattern = document.getElementById("fromPattern").value;
  const toPattern = document.getElementById("toPattern").value;
  chrome.storage.sync.set({ fromPattern, toPattern }, () => {
    const status = document.getElementById("status");
    status.textContent = "Settings saved.";
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
});

chrome.storage.sync.get(["fromPattern", "toPattern"], (data) => {
  if (data.fromPattern) document.getElementById("fromPattern").value = data.fromPattern;
  if (data.toPattern) document.getElementById("toPattern").value = data.toPattern;
});
