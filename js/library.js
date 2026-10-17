// Progressive enhancement helpers. No framework required.

document.addEventListener('DOMContentLoaded', function () {

  // Color swatches: for each li.color, use its hex text as background,
  // and pick a lighter text color for dark swatches (ITU-R BT.709 luma).
  document.querySelectorAll('li.color').forEach(function (li) {
    var color = li.textContent.trim();
    li.style.backgroundColor = color;

    var rgb = parseInt(color.slice(1), 16);
    var r = (rgb >> 16) & 0xff;
    var g = (rgb >> 8) & 0xff;
    var b = rgb & 0xff;
    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (luma < 85) {
      li.style.color = '#f0f0f0';
    }
  });

});
