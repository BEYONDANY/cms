// AI-GEN-BEGIN
(function () {
  const tbody = document.getElementById("post-sort-body");
  if (!tbody) return;

  let dragRow = null;

  tbody.querySelectorAll("tr[data-id]").forEach((row) => {
    row.setAttribute("draggable", "true");

    row.addEventListener("dragstart", (e) => {
      dragRow = row;
      row.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", row.getAttribute("data-id") || "");
      }
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      tbody.querySelectorAll("tr").forEach((r) => r.classList.remove("drag-over"));
      dragRow = null;
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!dragRow || dragRow === row) return;
      row.classList.add("drag-over");
      const rect = row.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (before) tbody.insertBefore(dragRow, row);
      else tbody.insertBefore(dragRow, row.nextSibling);
    });

    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));

    row.addEventListener("drop", async (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      const ids = [...tbody.querySelectorAll("tr[data-id]")].map((r) =>
        Number(r.getAttribute("data-id"))
      );
      try {
        const res = await fetch("/x/admin/posts/reorder", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          alert(data.error || "排序保存失败");
          location.reload();
          return;
        }
        const tip = document.getElementById("sort-ok");
        if (tip) {
          tip.hidden = false;
          tip.textContent = data.rebuilt
            ? "排序已保存，前台静态站已更新"
            : "排序已保存";
        }
      } catch {
        alert("排序保存失败");
        location.reload();
      }
    });
  });
})();
// AI-GEN-END
