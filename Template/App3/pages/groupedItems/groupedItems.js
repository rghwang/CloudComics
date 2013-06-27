(function () {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var nav = WinJS.Navigation;
    var ui = WinJS.UI;

    ui.Pages.define("/pages/groupedItems/groupedItems.html", {
        // groupHeaderPage로 이동합니다. groupHeaders에서 호출되었습니다.
        // 바로 가기 키 및 iteminvoked에서 호출되었습니다.

        navigateToGroup: function (key) {
            nav.navigate("/pages/itemDetail/itemDetail.html", { item: Data.getItemReference(Data.getItemsFromGroup(Data.resolveGroupReference(key)).getItem(0).data) });
        },

        // 이 함수는 사용자가 이 페이지로 이동할 때마다 호출되어
        // 페이지 요소를 응용 프로그램 데이터로 채웁니다.
        ready: function (element, options) {
            var param;
            if (options) {
                if (options.files) { // 파일을 선택해서 실행한 경우
                    param = options.files;
                } else if (options.folder) { // 앱을 직접 실행하거나, 앱 실행 중에 폴더로 진입하는 경우
                    param = options.folder;
                }

                if (options.resetPath) Data.resetPath();
            }
            if (param === undefined) param = Windows.Storage.KnownFolders.picturesLibrary;
            var dataPromise = Data.setFolder(param);

            var listView = element.querySelector(".groupeditemslist").winControl;
            listView.groupHeaderTemplate = element.querySelector(".headertemplate");
            //listView.itemTemplate = element.querySelector(".itemtemplate");
            listView.itemTemplate = this.storageRenderer.bind(this);
            listView.oniteminvoked = this._itemInvoked.bind(this);

            document.querySelector(".appbar_filename").innerText = Data.getPath(true);

            // 기본 모드에 있지 않을 때 현재 그룹으로 이동할 바로 가기 키(ctrl + alt + g)를
            // 설정합니다.
            listView.addEventListener("keydown", function (e) {
                if (appView.value !== appViewState.snapped && e.ctrlKey && e.keyCode === WinJS.Utilities.Key.g && e.altKey) {
                    var data = listView.itemDataSource.list.getAt(listView.currentItem.index);
                    this.navigateToGroup(data.group.key);
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            }.bind(this), true);

            this._initializeLayout(listView, appView.value);
            listView.element.focus();


            this.updatePageTitle();
            //var _this = this;
            //document.getElementById("up").addEventListener("click", function () {
            //    Data.goUp();
            //    _this.updatePageTitle();
            //});
            if (dataPromise) {
                dataPromise.done(function () {
                    if (options && options.item) {
                        var temp = nav.history.current.state.item;
                        nav.history.current.state.item = false;
                        return nav.navigate("/pages/itemDetail/itemDetail.html", { item: temp });
                    }
                });
            }

            document.getElementById("del").disabled = true;
            listView.onselectionchanged = function () {
                if (listView.selection.getIndices().length > 0) {
                    document.getElementById("del").disabled = false;
                } else document.getElementById("del").disabled = true;
            }
            document.getElementById("del").addEventListener("click", function () {
                var indices = listView.selection.getIndices();
                var item;
                var promiseArray = [];
                for (var i = 0 ; i < indices.length; i++) {
                    item = listView.itemDataSource.list.getAt(indices[i]);
                    promiseArray.push(item.storageItem.deleteAsync());
                }
                WinJS.Promise.join(promiseArray).done(function () {
                    for (var i = indices.length - 1; i >= 0; i--) {
                        Data.items.splice(indices[i], 1);
                    }
                });
            });
            //document.getElementById("copy").addEventListener("click", function () {
            //    var dp = new Windows.ApplicationModel.DataTransfer.DataPackage();
            //    dp.requestedOperation = Windows.ApplicationModel.DataTransfer.DataPackageOperation.copy;
            //    var txt = Data.getPath(true);
            //    dp.setText(txt);
            //    Windows.ApplicationModel.DataTransfer.Clipboard.setContent(dp);
            //    document.getElementById("copy").disabled = true;
            //    Windows.ApplicationModel.DataTransfer.Clipboard.oncontentchanged = function () {
            //        document.getElementById("copy").disabled = false;
            //    }
            //});
            document.getElementById("select").addEventListener("click", function () {
                // Verify that we are currently not snapped, or that we can unsnap to open the picker
                var currentState = Windows.UI.ViewManagement.ApplicationView.value;
                if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
                    !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
                    // Fail silently if we can't unsnap
                    return;
                }

                // Create the picker object and set options
                var openPicker = new Windows.Storage.Pickers.FolderPicker();
                openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.thumbnail;
                openPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.desktop;
                // Users expect to have a filtered view of their folders depending on the scenario.
                // For example, when choosing a documents folder, restrict the filetypes to documents for your application.
                openPicker.fileTypeFilter.replaceAll([".png", ".jpg", ".jpeg"]);

                // Open the picker for the user to pick a file
                openPicker.pickSingleFolderAsync().then(function (folder) {
                    if (folder) {
                        WinJS.Navigation.navigate(Application.navigator.home, { folder: folder, resetPath: true });
                    } else {
                        // The picker was dismissed with no selected file
                        WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
                    }
                });

            });

        },

        // 이 함수는 viewState 변경 내용에 응답하여 페이지 레이아웃을 업데이트합니다.
        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            var listView = element.querySelector(".groupeditemslist").winControl;
            if (lastViewState !== viewState) {
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    var handler = function (e) {
                        listView.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    }
                    listView.addEventListener("contentanimating", handler, false);
                    this._initializeLayout(listView, viewState);
                }
            }
        },
        updatePageTitle: function () {
            document.querySelector(".pagetitle").innerText = Data.getPath();
        },
        // 이 함수는 ListView를 새 레이아웃으로 업데이트합니다.
        _initializeLayout: function (listView, viewState) {
            /// <param name="listView" value="WinJS.UI.ListView.prototype" />

            if (viewState === appViewState.snapped) {
                //listView.itemDataSource = Data.groups.dataSource;
                //listView.groupDataSource = null;
                listView.itemDataSource = Data.items.dataSource;
                listView.groupDataSource = Data.groups.dataSource;
                listView.layout = new ui.ListLayout();
            } else {
                listView.itemDataSource = Data.items.dataSource;
                listView.groupDataSource = Data.groups.dataSource;

                listView.layout = new ui.GridLayout({ groupHeaderPosition: "top" });

            }
        },
        storageRenderer: function (itemPromise, element) {
            var img, overlay, overlayText;
            if (element === null) {
                // dom is not recycled, so create inital structure
                element = document.createElement("div");
                element.className = "item";
                element.innerHTML = "<img class=\"item-image\"/><div class='item-overlay'><div class='item-title'></div></div>";
            }
            img = element.querySelector("img");
            img.src = "/images/loading.png";
            overlay = element.querySelector(".item-overlay");
            overlayText = element.querySelector(".item-title");

            return {
                // returns the placeholder
                element: element,
                // and a promise that will complete when the item is fully rendered
                renderComplete: itemPromise.then(function (item) {
                    if( item.data.thumbnail != "/images/loading.png" ) img.src = item.data.thumbnail;
                    img.alt = item.data.title;
                    overlay.style.visibility = "visible";
                    overlayText.innerText = item.data.key;
                    return item.ready;
                })
            };
        },
        _itemInvoked: function (args) {
            if (appView.value === appViewState.snapped) {
                // 페이지가 맞춰진 경우 사용자가 그룹을 호출했습니다.
                //var group = Data.groups.getAt(args.detail.itemIndex);
                //this.navigateToGroup(group.key);


            } else {
                // 페이지가 맞춰지지 않은 경우 사용자가 항목을 호출했습니다.
            }

            var item = Data.items.getAt(args.detail.itemIndex);

            // 폴더를 선택한 경우
            if (item.storageItem.isOfType(Windows.Storage.StorageItemTypes.folder)) {
                nav.navigate("/pages/groupedItems/groupedItems.html", { folder: item.storageItem });
            }
            else {
                nav.navigate("/pages/itemDetail/itemDetail.html", { item: Data.getItemReference(item) });
            }
        }
    });
})();
