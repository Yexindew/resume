document.addEventListener('DOMContentLoaded', function() {
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbClose = document.getElementById('lightbox-close');

  function openLightbox(src) {
    lbImg.src = src;
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lb.style.display = 'none';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-lightbox]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      openLightbox(el.getAttribute('data-lightbox'));
    });
  });

  lb.addEventListener('click', function(e) {
    if (e.target === lb || e.target === lbImg) closeLightbox();
  });
  lbClose.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });
});
