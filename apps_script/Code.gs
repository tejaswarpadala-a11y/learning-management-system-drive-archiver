function doGet() {
  return HtmlService.createHtmlOutputFromFile("ui")
    .setTitle("LMS Drive Archiver");
}

function listCourses(baseUrl, token) {
  const url = baseUrl.replace(/\/$/, "") + "/api/v1/courses?per_page=100";

  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("Failed to fetch courses. Check token/base URL.");
  }

  return JSON.parse(response.getContentText())
    .map(c => ({ id: c.id, name: c.name }));
}

function startArchive(config) {
  const { baseUrl, token, folderName, selectedCourses } = config;

  const root = getOrCreateFolder(folderName);

  selectedCourses.forEach(course => {
    archiveCourse(baseUrl, token, root, course);
  });

  return "Archive completed for " + selectedCourses.length + " courses.";
}

function archiveCourse(baseUrl, token, rootFolder, course) {
  const courseFolder = rootFolder.createFolder(safeName(course.name));

  const courseDetailsUrl =
    baseUrl.replace(/\/$/, "") + "/api/v1/courses/" + course.id;

  const response = UrlFetchApp.fetch(courseDetailsUrl, {
    headers: { Authorization: "Bearer " + token }
  });

  courseFolder.createFile(
    "course.json",
    response.getContentText(),
    MimeType.PLAIN_TEXT
  );

  archiveFiles(baseUrl, token, courseFolder, course.id);
}

function archiveFiles(baseUrl, token, courseFolder, courseId) {
  const filesUrl =
    baseUrl.replace(/\/$/, "") +
    "/api/v1/courses/" +
    courseId +
    "/files?per_page=100";

  const response = UrlFetchApp.fetch(filesUrl, {
    headers: { Authorization: "Bearer " + token }
  });

  const files = JSON.parse(response.getContentText());

  const filesFolder = courseFolder.createFolder("files");

  files.forEach(file => {
    if (!file.url) return;

    const blob = UrlFetchApp.fetch(file.url, {
      headers: { Authorization: "Bearer " + token }
    }).getBlob();

    filesFolder.createFile(blob.setName(safeName(file.display_name)));
  });
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function safeName(name) {
  return name.replace(/[^\w\-. ]+/g, "_");
}
