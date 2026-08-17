document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.sp-tab-btn');
  const tabContents = document.querySelectorAll('.sp-tab-content');
  const refreshBtn = document.getElementById('sp-refresh-btn');
  const clipIframe = document.getElementById('sp-clip-iframe');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab)?.classList.add('active');
    });
  });

  refreshBtn.addEventListener('click', () => {
    if (clipIframe) {
      clipIframe.src = clipIframe.src; // eslint-disable-line no-self-assign
    }
  });
});
