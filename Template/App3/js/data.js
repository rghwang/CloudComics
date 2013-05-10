(function () {
    "use strict";

    var PATH_SELECTION = "My Selection";
    var folder;
    var events = {};
    var options = {
        accessList: new WinJS.Binding.List(),
    };

    // 로컬 저장소의 accessList를 가져옴
    var s = Windows.Storage.ApplicationData.current.localSettings.values["accessList"];
    if (s === undefined) s = "";
    else {
        var a = s.split("|");
        var b;
        for (var i = 0; i < a.length; i++) {
            b = a[i].split("?");
            options.accessList.push({ title: b[0], token: b[1] });
        }
    }
    WinJS.Namespace.define("Data", {
        setFolder: setFolder,
        getPath: getPath,
        dbg: dbg,
        events: events,
        resetPath: resetPath,
        getAccessList: getAccessList,
        addAccessList: addAccessList,
        removeAccessList: removeAccessList,
        clearAccessList: clearAccessList,
        checkAccess: checkAccess,
        itemsDataSource: null,
        filesDataSource: null,
        foldersDataSource: null,
        foldersTotal: 0,
        items: null,
        getItemFromFile: getItemFromFile,
    });
    var currentPath = [];
    function dbg(msg) {
        new Windows.UI.Popups.MessageDialog(msg).showAsync();
    }
    function clearAccessList() {
        Windows.Storage.ApplicationData.current.localSettings.values.remove("accessList");
        Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.clear();
        while (options.accessList.length > 0) options.accessList.pop();
    }

    function getAccessList() {
        return options.accessList;
    }
    function addAccessList(folder) {
        var found = false;
        options.accessList.map(function (o) {
            if (o.title == folder.path) {
                found = true;
                return;
            }
        });

        if (!found) {
            var token = Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.add(folder);
            options.accessList.push({
                title: folder.path,
                token: token,
            });
            saveAccessList();
        }
    }
    function removeAccessList(indices) {
        var offset = 0; // indices = [1,3,5] 이렇게 들어왔을 때, 1=>2=>3 순서로 지움. 예) list = [0,1,2,3,4,5] => [0,2,3,4,5] => [0,2,4,5] => [0,2,4]
        for (var i = 0; i < indices.length; i++) {
            Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.remove(options.accessList.getAt(indices[i - offset]).token);
            options.accessList.splice(indices[i - offset], 1);
            offset++;
        }
        saveAccessList();
    }
    function saveAccessList() {
        var str = "";
        options.accessList.map(function (e) {
            str += e.title + "?" + e.token + "|";
        });
        if (str === "") Windows.Storage.ApplicationData.current.localSettings.values.remove("accessList");
        else Windows.Storage.ApplicationData.current.localSettings.values["accessList"] = str.substr(0, str.length - 1);
    }
    function checkAccess(folderPath) {
        var found = false;
        for (var i = 0; i < options.accessList.length; i++) {
            if (folderPath.indexOf(options.accessList.getAt(i).title) !== -1) {
                found = true;
                break;
            }
        }
        return found;
    }
    function setFolder(storageFolder) {

        //if (storageFolder.length >= 1) { // 선택한 파일이 있는 경우
        //    var folderPath = storageFolder[0].path.substring(0, storageFolder[0].path.lastIndexOf("\\"));

        //    addPath(PATH_SELECTION, "");
        //    addItems(storageFolder);

        //    var folderName = folderPath.substring(0, folderPath.lastIndexOf("\\"));
        //    folder = {
        //        path: folderPath,
        //        name: folderName
        //    };

        //} else { // 폴더를 지정해서 여는 경우
        //    addPath(storageFolder.name, storageFolder.path);
        //    // TODO: 데이터를 실제 데이터로 바꿉니다.
        //    // 사용할 수 있는 경우 언제든지 비동기 소스로부터 데이터를 추가할 수 있습니다.
        //    folder = storageFolder;

        //    folder.getItemsAsync().done(addItems);
        //}
        folder = storageFolder;
        addPath(storageFolder.name, storageFolder.path);

        var fileTypeFilter = [".jpg", ".jpeg", ".png"];
        var queryOptions = new Windows.Storage.Search.QueryOptions(Windows.Storage.Search.CommonFileQuery.defaultQuery, fileTypeFilter);
        queryOptions.folderDepth = Windows.Storage.Search.FolderDepth.shallow;
        queryOptions.indexerOption = Windows.Storage.Search.IndexerOption.useIndexerWhenAvailable;
        queryOptions.sortOrder.clear();
        // Order items by type so folders come first
        queryOptions.sortOrder.append({ ascendingOrder: false, propertyName: "System.IsFolder" });
        queryOptions.sortOrder.append({ ascendingOrder: true, propertyName: "System.ItemName" });

        var itemQuery = storageFolder.createItemQueryWithOptions(queryOptions);
        var fileQuery = storageFolder.createFileQueryWithOptions(queryOptions);
        var folderQuery = storageFolder.createFolderQuery();
        var dataSourceOptions = {
            mode: Windows.Storage.FileProperties.ThumbnailMode.picturesView,
            requestedThumbnailSize: 190,
            thumbnailOptions: Windows.Storage.FileProperties.ThumbnailOptions.none
        };

        Data.itemsDataSource = new WinJS.UI.StorageDataSource(itemQuery, dataSourceOptions);
        Data.filesDataSource = new WinJS.UI.StorageDataSource(fileQuery, dataSourceOptions);
        Data.foldersDataSource = new WinJS.UI.StorageDataSource(folderQuery, dataSourceOptions);
        Data.foldersDataSource.getCount().done(function (n) {
            Data.foldersTotal = n;
        });

    }
    function addPath(dirName, path) {
        var found = false;
        for (var i = 0 ; i < currentPath.length; i++) {
            if (currentPath[i].path === path) {
                found = true;
                currentPath.splice(i + 1);
                return false;
            }
        }
        if (!found) {
            currentPath.push({
                name: dirName,
                path: path
            });
        }
    }
    function getPath(isAbsolute) {
        if (isAbsolute) {
            if (folder.path === "") return folder.name;
            else return folder.path;
        }
        var path = "";
        for (var i = 0; i < currentPath.length; i++) {
            path += currentPath[i].name + "\\";
        }
        return path.substr(0, path.length - 1);
        //var path;
        //if (folder.path === "") {
        //    var filepath = getItemsFromGroup(resolveGroupReference("files")).getAt(0).file.path;
        //    path = filepath.substring(0, filepath.lastIndexOf("\\"));
        //} else {
        //    path = folder.path;
        //}
        //return path;
    }
    function resetPath() {
        currentPath = [];
    }
    function getParentFolderFromPath(pathString) {
        return pathString.substring(0, pathString.lastIndexOf("\\"));
    }
    function getItemFromFile(file) {
        for (var i = 0; i < Data.items.length; i++) {
            if (Data.items[i].name === file.name) {
                return {
                    index: i,
                    data: file
                }
            }
        }
        return false;
    }
})();
