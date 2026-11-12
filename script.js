// Progressive enhancement only — the form works without this.
(function () {
  var form = document.querySelector('.order-form');
  if (!form) return;

  function toggle(name, value, targetId) {
    var target = document.getElementById(targetId);
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    target.hidden = !(checked && checked.value === value);
  }

  function update() {
    toggle('ornament_type', 'photo', 'photo-option');
    toggle('delivery', 'ship', 'ship-address');
    var addr = document.getElementById('address');
    addr.required = !document.getElementById('ship-address').hidden;
  }

  form.addEventListener('change', update);
  update();
})();
