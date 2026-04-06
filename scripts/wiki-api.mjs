const PROXY_URL = "http://localhost:30001";

export class WikiAPI {
  constructor(wikiUrl, username, password) {
    // Normalize URL: strip trailing slashes and /wiki paths
    const base = wikiUrl.replace(/\/wiki\/?$/, "").replace(/\/+$/, "");
    this.wikiApiUrl = `${base}/w/api.php`;
    this.username = username;
    this.password = password;
  }

  async _request(params, method = "GET") {
    params.format = "json";
    const headers = {
      "X-Wiki-Url": this.wikiApiUrl
    };

    let url = PROXY_URL;
    let body = null;

    if (method === "GET") {
      url += "?" + new URLSearchParams(params).toString();
    } else {
      body = new URLSearchParams(params);
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    const resp = await fetch(url, {
      method,
      headers,
      body,
      credentials: "include"
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    return resp.json();
  }

  async login() {
    // Step 1: Get login token
    const tokenData = await this._request({
      action: "query",
      meta: "tokens",
      type: "login"
    });
    const loginToken = tokenData.query.tokens.logintoken;

    // Step 2: Login with credentials
    const loginData = await this._request({
      action: "login",
      lgname: this.username,
      lgpassword: this.password,
      lgtoken: loginToken
    }, "POST");

    if (loginData.login.result !== "Success") {
      throw new Error(`Login failed: ${loginData.login.result} - ${loginData.login.reason || ""}`);
    }

    return loginData;
  }

  async getCsrfToken() {
    const data = await this._request({
      action: "query",
      meta: "tokens"
    });
    return data.query.tokens.csrftoken;
  }

  async editPage(title, content, summary, token) {
    const data = await this._request({
      action: "edit",
      title,
      text: content,
      summary,
      token
    }, "POST");

    if (data.error) {
      throw new Error(`Edit failed: ${data.error.code} - ${data.error.info}`);
    }

    return data;
  }

  async uploadFile(filename, blob, comment = "Uploaded from Foundry VTT", token) {
    const formData = new FormData();
    formData.append("action", "upload");
    formData.append("filename", filename);
    formData.append("comment", comment);
    formData.append("ignorewarnings", "1");
    formData.append("token", token);
    formData.append("format", "json");
    formData.append("file", blob, filename);

    const resp = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "X-Wiki-Url": this.wikiApiUrl
      },
      body: formData,
      credentials: "include"
    });

    if (!resp.ok) {
      throw new Error(`Upload HTTP ${resp.status}: ${resp.statusText}`);
    }

    const data = await resp.json();
    if (data.error) {
      throw new Error(`Upload failed: ${data.error.code} - ${data.error.info}`);
    }

    return data;
  }

  async createOrUpdatePage(title, content, summary, imageBlob, imageFilename) {
    await this.login();

    // Upload image first if provided
    if (imageBlob && imageFilename) {
      try {
        const uploadToken = await this.getCsrfToken();
        await this.uploadFile(imageFilename, imageBlob, `Image for ${title}`, uploadToken);
      } catch (err) {
        console.warn("Image upload failed (page will still be created):", err.message);
      }
    }

    // Get a fresh token for the page edit
    const editToken = await this.getCsrfToken();
    return this.editPage(title, content, summary, editToken);
  }
}
