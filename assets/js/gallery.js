/**
 * Atelier Cloud Dancer — Interactive Product Gallery, Lens Zoom & Accordions
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Interactive Image Gallery
  const mainImage = document.getElementById('mainGalleryImage');
  const thumbs = document.querySelectorAll('.gallery-thumb-item');

  if (mainImage && thumbs.length > 0) {
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const fullSrc = thumb.getAttribute('data-full-src');
        if (!fullSrc) return;

        // Smooth transition
        mainImage.style.opacity = '0.4';
        setTimeout(() => {
          mainImage.src = fullSrc;
          mainImage.style.opacity = '1';
        }, 120);

        // Update active thumbnail border
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }

  // 2. Collector Lens Zoom & Pan on Hover
  const mainFrame = document.querySelector('.gallery-main-frame');
  if (mainFrame && mainImage) {
    mainFrame.addEventListener('mousemove', (e) => {
      const rect = mainFrame.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      mainImage.style.transformOrigin = `${x}% ${y}%`;
      mainImage.style.transform = 'scale(1.55)';
    });

    mainFrame.addEventListener('mouseleave', () => {
      mainImage.style.transformOrigin = 'center center';
      mainImage.style.transform = 'scale(1)';
    });
  }

  // 3. Editorial Collapsible Accordions
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      if (!item) return;

      const isOpen = item.classList.contains('active');
      
      // Close all other accordions in the same group
      const parentGroup = item.closest('.editorial-accordions');
      if (parentGroup) {
        parentGroup.querySelectorAll('.accordion-item').forEach(other => {
          if (other !== item) other.classList.remove('active');
        });
      }

      // Toggle current
      if (isOpen) {
        item.classList.remove('active');
      } else {
        item.classList.add('active');
      }
    });
  });
});
