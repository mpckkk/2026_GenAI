<#macro content>
  <#if (pageId!"") == "login" && properties.demoEmail?has_content && properties.demoPassword?has_content>
    <section class="celloras-demo" aria-labelledby="celloras-demo-title">
      <h2 id="celloras-demo-title">Demo login</h2>
      <p>Explore the prepared soybean workspace.</p>
      <dl>
        <div><dt>Email</dt><dd><code id="celloras-demo-email">${properties.demoEmail}</code></dd></div>
        <div><dt>Password</dt><dd><code id="celloras-demo-password">${properties.demoPassword}</code></dd></div>
      </dl>
      <button id="celloras-demo-fill" class="celloras-demo-button" type="button" hidden>Use demo credentials</button>
    </section>
    <script type="module" src="${url.resourcesPath}/js/demo-login.js"></script>
  </#if>
  <a class="celloras-home" href="${properties.appUrl}">${msg("backToCelloras")}</a>
</#macro>
