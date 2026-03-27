// pierce hero — copy install command on click
document.addEventListener('DOMContentLoaded', function() {
  var install = document.querySelector('.pierce-hero-install');
  if (install) {
    install.addEventListener('click', function() {
      navigator.clipboard.writeText('npm install pierce');
      var cmd = install.querySelector('.cmd');
      var orig = cmd.textContent;
      cmd.textContent = 'copied!';
      setTimeout(function() { cmd.textContent = orig; }, 1500);
    });
  }
});
