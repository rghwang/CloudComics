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
            if (options && options.files) {
                Data.setFolder(options.files);
            } else {
                options && options.folder ? Data.setFolder(options.folder) : Data.setFolder(Windows.Storage.KnownFolders.picturesLibrary);
            }
            var listView = element.querySelector(".groupeditemslist").winControl;
            listView.groupHeaderTemplate = element.querySelector(".headertemplate");
            listView.itemTemplate = element.querySelector(".itemtemplate");
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

        _itemInvoked: function (args) {
            if (appView.value === appViewState.snapped) {
                // 페이지가 맞춰진 경우 사용자가 그룹을 호출했습니다.
                //var group = Data.groups.getAt(args.detail.itemIndex);
                //this.navigateToGroup(group.key);

                var item = Data.items.getAt(args.detail.itemIndex);

                // 폴더를 선택한 경우
                if (item.folder !== undefined) {
                    nav.navigate("/pages/groupedItems/groupedItems.html", { folder: item.folder });
                    //Data.setFolder(item.folder);
                    //this.updatePageTitle();
                }
                else {
                    nav.navigate("/pages/itemDetail/itemDetail.html", { item: Data.getItemReference(item) });
                }

            } else {
                // 페이지가 맞춰지지 않은 경우 사용자가 항목을 호출했습니다.

                var item = Data.items.getAt(args.detail.itemIndex);

                // 폴더를 선택한 경우
                if (item.folder !== undefined) {
                    nav.navigate("/pages/groupedItems/groupedItems.html", { folder: item.folder });
                    //Data.setFolder(item.folder);
                    //this.updatePageTitle();
                }
                else {
                    nav.navigate("/pages/itemDetail/itemDetail.html", { item: Data.getItemReference(item) });
                }
            }
        }
    });
})();
