// AI-GEN-BEGIN
(function () {
  if (typeof tinymce === "undefined") return;

  tinymce.init({
    selector: "#post-content",
    license_key: "gpl",
    height: 480,
    menubar: false,
    branding: false,
    promotion: false,
    plugins: "lists link image media table code autoresize",
    toolbar:
      "undo redo | styles | bold italic underline | bullist numlist | link image media | blockquote table | removeformat code",
    style_formats: [
      { title: "段落", format: "p" },
      { title: "标题 2", format: "h2" },
      { title: "标题 3", format: "h3" },
      { title: "引用", format: "blockquote" },
    ],
    relative_urls: false,
    convert_urls: false,
    automatic_uploads: true,
    images_upload_credentials: true,
    images_file_types: "jpg,jpeg,png,gif,webp",
    file_picker_types: "image media",
    media_live_embeds: true,
    media_alt_source: false,
    media_poster: false,
    images_upload_handler: function (blobInfo) {
      return new Promise(function (resolve, reject) {
        var fd = new FormData();
        fd.append("file", blobInfo.blob(), blobInfo.filename());
        fetch("/x/admin/media", {
          method: "POST",
          body: fd,
          credentials: "same-origin",
        })
          .then(function (res) {
            return res.json().then(function (data) {
              if (!res.ok || !data.ok) {
                throw new Error(data.error || "上传失败");
              }
              resolve(data.url);
            });
          })
          .catch(function (err) {
            reject(err && err.message ? err.message : "上传失败");
          });
      });
    },
    setup: function (editor) {
      var form = document.getElementById("post-editor-form");
      if (!form) return;
      form.addEventListener("submit", function () {
        editor.save();
      });
    },
  });
})();
// AI-GEN-END
