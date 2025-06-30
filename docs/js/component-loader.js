/**
 * Finds all elements with a `data-include` attribute and replaces them
 * with the content of the specified HTML file.
 *
 * This function also ensures that any <script> tags within the loaded
 * HTML are executed, allowing for self-contained components.
 */
export async function loadComponents() {
  const includes = document.querySelectorAll('[data-include]');

  // Create an array of promises for all fetch operations
  const fetchPromises = Array.from(includes).map(async (placeholder) => {
    const file = placeholder.getAttribute('data-include');
    if (!file) {
      console.error('Placeholder has no data-include attribute:', placeholder);
      return;
    }

    try {
      const response = await fetch(file);
      if (!response.ok) {
        throw new Error(`Failed to fetch component: ${response.statusText}`);
      }
      const html = await response.text();

      // Parse the fetched HTML into a template so we can work with the DOM nodes
      const template = document.createElement('template');
      template.innerHTML = html.trim();

      // Execute any <script> tags by cloning them into real script elements
      const scripts = template.content.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');

        // Copy attributes such as type or module
        [...oldScript.attributes].forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );

        // Copy inline code and add sourceURL for better debugging
        newScript.textContent = oldScript.textContent + `\n//# sourceURL=${file}`;

        // Replace the old (inert) script with the live one
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      // Replace the placeholder with the fully-hydrated component
      placeholder.replaceWith(template.content);
    } catch (error) {
      console.error(`Error loading component from ${file}:`, error);
      // Optionally, display an error message in the placeholder's place
      placeholder.innerHTML = `<div style="color: red;">Failed to load component: ${file}</div>`;
    }
  });

  // Wait for all components to be loaded and processed
  await Promise.all(fetchPromises);
}
