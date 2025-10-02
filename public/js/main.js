// Basic client-side validation helper
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[novalidate]').forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        alert('Please fill in all required fields correctly.');
      }
    });
  });
});
