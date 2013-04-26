(function () {
    "use strict";

    var list = new WinJS.Binding.List();
    var groupedItems = list.createGrouped(
        function groupKeySelector(item) { return item.group.key; },
        function groupDataSelector(item) { return item.group; }
    );
    var folder;
    WinJS.Namespace.define("Data", {
        items: groupedItems,
        groups: groupedItems.groups,
        getItemReference: getItemReference,
        getItemsFromGroup: getItemsFromGroup,
        resolveGroupReference: resolveGroupReference,
        resolveItemReference: resolveItemReference,
        setFolder:setFolder,
        goUp: goUp,
        getPath: getPath,
    });
    function getPath() {
        var path;
        if (folder.path === "") {
            var filepath = getItemsFromGroup(resolveGroupReference("files")).getAt(0).file.path;
            path = filepath.substring(0, filepath.lastIndexOf("\\"));
        } else {
            path = folder.path;
        }
        return path;
    }
    function goUp() {
        var str = folder.path;
        var path = str.substring(0, str.lastIndexOf("\\"));
        Windows.Storage.StorageFolder.getFolderFromPathAsync(path).then(function (f) {
            setFolder(f);
        });
    }
    function resetData() {
        list.forEach(function () { list.shift() });
    }
    function setFolder(storageFolder) {
        resetData();
        // TODO: 데이터를 실제 데이터로 바꿉니다.
        // 사용할 수 있는 경우 언제든지 비동기 소스로부터 데이터를 추가할 수 있습니다.
        folder = storageFolder;
        var count = 0;
        var total = 0;
        var item;

        folder.getFoldersAsync().done(function (folders) {
            total = folders.length;
            folders.forEach(function (subfolder) {
                subfolder.getThumbnailAsync(Windows.Storage.FileProperties.ThumbnailMode.singleItem).done(function (thumbnail) {
                    count++;
                    item = {
                        group: {
                            key: "_folders",
                            title: "Folders",
                            folder: folder
                        },
                        title: subfolder.name,
                        folder: subfolder,
                        thumbnail: URL.createObjectURL(thumbnail)
                    };
                    list.push(item);
                    if (count >= total) {
                        list.sort(function (f, s) {
                            if (f == s) return 0;
                            else if (f.group.title > s.group.title || (f.group.title == s.group.title && f.title > s.title))
                                return 1;
                            else return -1;
                        });
                    }
                });
            });
        });

        total = count = 0;
        folder.getFilesAsync().done(function (files) {
            total = files.length;
            files.forEach(function (file) {
                file.getThumbnailAsync(Windows.Storage.FileProperties.ThumbnailMode.picturesView).done(function (thumbnail) {
                    count++;
                    if (file.fileType.toLowerCase() == ".jpg" || file.fileType.toLowerCase() == ".png") {
                        item = {
                            group: {
                                key: "files",
                                title: "Files",
                                folder: folder
                            },
                            title: file.name,
                            image: URL.createObjectURL(file),
                            file: file,
                            thumbnail: URL.createObjectURL(thumbnail)
                        };
                        list.push(item);
                    }
                    if (count >= total) {
                        list.sort(function (f, s) {
                            if (f == s) return 0;
                            else if (f.group.title > s.group.title || (f.group.title == s.group.title && f.title > s.title))
                                return 1;
                            else return -1;
                        });
                    }
                });
            });

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
