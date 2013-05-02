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
        folderList: new WinJS.Binding.List(),
    };

    WinJS.Namespace.define("Data", {
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
        options: options,
    });
    var currentPath = [];
    function dbg(msg) {
        new Windows.UI.Popups.MessageDialog(msg).showAsync();

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
    function resetData(isLaunched) {
        if (isLaunched) currentPath = [];
        list.forEach(function () { list.shift() });
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
            list.sort(function (f, s) {
                if (f == s) return 0;
                else if (f.group.title > s.group.title || (f.group.title == s.group.title && f.title > s.title))
                    return 1;
                else return -1;
            });
            getNextThumbnail();
        }
    }
    var thumbnailCount = 0;
    function getNextThumbnail() {
        var item = list.getAt(thumbnailCount++);
        item.storageItem.getThumbnailAsync(Windows.Storage.FileProperties.ThumbnailMode.singleItem).done(function (thumbnail) {
            if (thumbnail) {
                item.thumbnail = URL.createObjectURL(thumbnail);
                //var q = ".item-image[alt=\"" + item.title + "\"]";
                //var e = document.querySelector(q)
                //if (e) e.src = item.thumbnail;

                // crash if the thumbnailCount is too big(>160)
                if (thumbnailCount < list.length) {
                    getNextThumbnail();
                } else {
                    thumbnailCount = 0;
                }
            }
        });

    }
    function setFolder(storageFolder) {
        if (storageFolder.length >= 1) {
            resetData(true);
            addPath(PATH_SELECTION, "");
            addItems(storageFolder);

            var path = storageFolder[0].path.substring(0, storageFolder[0].path.lastIndexOf("\\"));
            var name = path.substring(0, path.lastIndexOf("\\"));
            folder = {
                path: path,
                name: name
            };
        } else {
            resetData();
            addPath(storageFolder.name, storageFolder.path);
            // TODO: 데이터를 실제 데이터로 바꿉니다.
            // 사용할 수 있는 경우 언제든지 비동기 소스로부터 데이터를 추가할 수 있습니다.
            folder = storageFolder;

            folder.getItemsAsync().done(addItems);
        }
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
