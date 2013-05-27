(function () {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var nav = WinJS.Navigation;
    var ui = WinJS.UI;
    var dataSource;

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

            Data.setFolder(param);

            // 지정한 파일이 있는 경우

            //if (options && options.file) {
            //    var temp = nav.history.current.state.file;
            //    // 뒤로가기로 돌아올 경우를 대비해서 네비게이션 히스토리의 options 값에 file을 제거
            //    nav.history.current.state.file = false;

            //    nav.navigate("/pages/itemDetail/itemDetail.html", { item: { index: 5 } });
            //    //return nav.navigate("/pages/itemDetail/itemDetail.html", { item: Data.getItemFromFile(temp) });
            //}


            var listView = loadListViewControl();
            
            this._initializeLayout(listView, appView.value);
            listView.element.focus();

            this.updatePageTitle();

            document.getElementById("del").disabled = true;
            listView.onselectionchanged = function () {
                if (listView.selection.getIndices().length > 0) {
                    document.getElementById("del").disabled = false;
                } else document.getElementById("del").disabled = true;
            }
            document.getElementById("del").addEventListener("click", function () {
                var indices = listView.selection.getIndices();
                var promiseArray = [];
                var items = [];
                for (var i = 0 ; i < indices.length; i++) {
                    promiseArray.push(listView.itemDataSource.itemFromIndex(indices[i]).done(function (item) {
                        items.push(item);
                    }));
                }
                // 모든 파일을 다 가져오고 나서 한번에 삭제
                WinJS.Promise.join(promiseArray).done(function () {
                    for (var i = 0; i < items.length; i++) {
                        items[i].data.deleteAsync();
                    }
                });
            });
            document.getElementById("copy").addEventListener("click", function () {
                var dp = new Windows.ApplicationModel.DataTransfer.DataPackage();
                dp.requestedOperation = Windows.ApplicationModel.DataTransfer.DataPackageOperation.copy;
                var txt = Data.getPath();
                dp.setText(txt);
                Windows.ApplicationModel.DataTransfer.Clipboard.setContent(dp);
                document.getElementById("copy").disabled = true;
                Windows.ApplicationModel.DataTransfer.Clipboard.oncontentchanged = function () {
                    document.getElementById("copy").disabled = false;
                }
            });
            document.getElementById("select").addEventListener("click", function () {
                // Verify that we are currently not snapped, or that we can unsnap to open the picker
                var currentState = Windows.UI.ViewManagement.ApplicationView.value;
                if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
                    !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
                    // Fail silently if we can't unsnap
                    return;
                }

                // Create the picker object and set options
                var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
                openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.thumbnail;
                openPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.desktop;
                // Users expect to have a filtered view of their folders depending on the scenario.
                // For example, when choosing a documents folder, restrict the filetypes to documents for your application.
                openPicker.fileTypeFilter.replaceAll([".png", ".jpg", ".jpeg"]);

                // Open the picker for the user to pick a file
                openPicker.pickMultipleFilesAsync().then(function (files) {
                    if (files.size > 0) {
                        WinJS.Navigation.navigate(Application.navigator.home, { files: files , resetPath:true});
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

            var listView = document.getElementById("listviewDiv").winControl;
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
                listView.layout = new ui.ListLayout();
            } else {
                listView.layout = new ui.GridLayout({ groupHeaderPosition: "top" });

            }
        },
    });
    function loadListViewControl() {
        // Build datasource from the pictures library
        var container = document.getElementById("listviewDiv");
        var listViewOptions = {
            itemDataSource: Data.itemsDataSource,
            itemTemplate: storageRenderer,
            oniteminvoked : _itemInvoked,
            layout: new WinJS.UI.GridLayout(),
            selectionMode: "multi"
        };

        document.querySelector(".appbar_filename").innerText = Data.getPath(true);

        var listViewControl = new WinJS.UI.ListView(container, listViewOptions);
        return listViewControl;
    };
    function storageRenderer(itemPromise, element) {
        var img, overlay, overlayText;
        if (element === null) {
            // dom is not recycled, so create inital structure
            element = document.createElement("div");
            element.innerHTML = "<img /><div class='overlay'><div class='overlayText'></div></div>";
        }
        img = element.querySelector("img");
        overlay = element.querySelector(".overlay");
        overlayText = element.querySelector(".overlayText");
        img.style.opacity = 0;

        return {
            // returns the placeholder
            element: element,
            // and a promise that will complete when the item is fully rendered
            renderComplete: itemPromise.then(function (item) {
                // now do easy work
                if (item.data.isOfType(Windows.Storage.StorageItemTypes.folder)) {
                    overlay.style.visibility = "visible";
                    overlayText.innerText = item.data.name;
                } else {
                    overlay.style.visibility = "hidden";
                }
                return item.ready;
            }).then(function (item) {
                // wait until item.ready before doing expensive work
                return WinJS.UI.StorageDataSource.loadThumbnail(item, img);
            })
        };
    }
    function _itemInvoked(args) {
        if (appView.value === appViewState.snapped) {
            // 페이지가 맞춰진 경우 사용자가 그룹을 호출했습니다.
            //var group = Data.groups.getAt(args.detail.itemIndex);
            //this.navigateToGroup(group.key);


        } else {
            // 페이지가 맞춰지지 않은 경우 사용자가 항목을 호출했습니다.
        }

        Data.itemsDataSource.itemFromIndex(args.detail.itemIndex).done(function (item) {
            // 폴더를 선택한 경우
            if (item.data.isOfType(Windows.Storage.StorageItemTypes.folder)) {
                nav.navigate("/pages/groupedItems/groupedItems.html", { folder: item.data });
            }
            else {
                nav.navigate("/pages/itemDetail/itemDetail.html", { item: item });
            }
        });
    }

})();
