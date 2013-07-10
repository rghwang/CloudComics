(function () {
    "use strict";

    var PATH_SELECTION = "My Selection";
    var list = new WinJS.Binding.List();
    var groupedItems = list.createGrouped(
        function groupKeySelector(item) { return item.group.key; },
        function groupDataSelector(item) { return item.group; }
    );
    //list.onitemmutated = function (e) {
    //    e;
    //}
    var folder;
    var events = {};
    var options = {
        accessList: new WinJS.Binding.List(),
    };

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
        // For real service
        //currentApp: Windows.ApplicationModel.Store.CurrentApp,
        // For test app purchase
        currentApp: Windows.ApplicationModel.Store.CurrentAppSimulator,
        items: groupedItems,
        groups: groupedItems.groups,
        getItemReference: getItemReference,
        getItemsFromGroup: getItemsFromGroup,
        resolveGroupReference: resolveGroupReference,
        resolveItemReference: resolveItemReference,
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
        addRootSlash: addRootSlash,
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
    function addRootSlash(folderPath) {
        var path = folderPath;

        if (path.length === 2 && path.charAt(1) === ":") {
            path += "\\";
        }
        return path;
    }
    function setFolder(storageFolder) {
        if (storageFolder.length >= 1) { // 선택한 파일이 있는 경우
            resetData();
            var folderPath = storageFolder[0].path.substring(0, storageFolder[0].path.lastIndexOf("\\"));

            addPath(PATH_SELECTION, "");
            addItems(storageFolder);

            var folderName = folderPath.substring(0, folderPath.lastIndexOf("\\"));
            folder = {
                path: folderPath,
                name: folderName
            };

        } else { // 폴더를 지정해서 여는 경우
            resetData();
            addPath(storageFolder.name, storageFolder.path);
            // TODO: 데이터를 실제 데이터로 바꿉니다.
            // 사용할 수 있는 경우 언제든지 비동기 소스로부터 데이터를 추가할 수 있습니다.
            folder = storageFolder;
            var dataPromise = folder.getItemsAsync();
            dataPromise.then(addItems);
            return dataPromise;
        }
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
    function resetData() {
        list.forEach(function () { list.shift() });
    }
    function resetPath() {
        currentPath = [];
    }
    function getParentFolderFromPath(pathString) {
        return pathString.substring(0, pathString.lastIndexOf("\\"));
    }
    function addItems(storageObjects) {
        storageObjects.forEach(function (o) {

            var item;

            // 아이템이 폴더인 경우
            if (o.isOfType(Windows.Storage.StorageItemTypes.folder)) {
                item = {
                    group: {
                        key: "_folders",
                        title: "Folders",
                        folder: folder
                    },
                    key: o.name,
                    title: o.name,
                    path: o.path,
                    storageItem: o,
                    thumbnail: "/images/loading.png",
                };
                list.push(item);
            } else {
                if (o.fileType.toLowerCase() == ".jpg" || o.fileType.toLowerCase() == ".png" || o.fileType.toLowerCase() == ".jpeg") {
                    item = {
                        group: {
                            key: "files",
                            title: "Files",
                            folder: folder
                        },
                        key: o.name,
                        title: o.name,
                        path: o.path,
                        image: URL.createObjectURL(o),
                        storageItem: o,
                        thumbnail: "/images/loading.png",
                    };
                    list.push(item);
                }
            }
        });
        if (list.length > 0) {
            /*
            list.sort(function (f, s) {
                if (f == s) return 0;
                else if (f.group.title < s.group.title || (f.group.title == s.group.title && f.title > s.title))
                    return 1;
                else return -1;
            });
            */
            getNextThumbnail();
        } else {
            document.getElementById("msg").textContent = "There is no folders or files in this view. Please select another folder from the appbar.";
        }
    }
    var index = 0;
    var thumbnailCount = 0;
    function getNextThumbnail() {
        if (index < list.length) var item = list.getAt(index++);
        else {
            index = 0;
            thumbnailCount = 0;
            return;
        }

        item.storageItem.getThumbnailAsync(Windows.Storage.FileProperties.ThumbnailMode.picturesView).done(function (thumbnail) {
            if (thumbnail) item.thumbnail = URL.createObjectURL(thumbnail);
            
            var query = ".item-image[alt=\"" + item.title + "\"]";
            var img = document.querySelector(query);
            if (img) {
                img.src = item.thumbnail;
            }

            if (++thumbnailCount > 100) {
                setTimeout(getNextThumbnail, 1000);
                thumbnailCount = 0;
                return;
            } else {
                getNextThumbnail();
            }
        });

    }

    // 그룹 키와 항목 제목을 손쉽게 serialize할 수 있는 고유 참조로 사용하여
    // 항목에 대한 참조를 가져옵니다.
    function getItemReference(item) {
        return [item.group.key, item.title];
    }

    // 이 함수는 제공된 그룹에 속한 항목만 포함된
    // WinJS.Binding.List를 반환합니다.
    function getItemsFromGroup(group) {
        return list.createFiltered(function (item) { return item.group.key === group.key; });
    }

    // 제공된 그룹 키에 해당되는 고유 그룹을 가져옵니다.
    function resolveGroupReference(key) {
        for (var i = 0; i < groupedItems.groups.length; i++) {
            if (groupedItems.groups.getAt(i).key === key) {
                return groupedItems.groups.getAt(i);
            }
        }
    }

    // 그룹 키 및 항목 제목을 포함하는 제공된 문자열 배열에서 고유한 항목을
    // 가져옵니다.
    function resolveItemReference(reference) {
        for (var i = 0; i < groupedItems.length; i++) {
            var item = groupedItems.getAt(i);
            if (item.group.key === reference[0] && item.title === reference[1]) {
                return item;
            }
        }
    }

})();
