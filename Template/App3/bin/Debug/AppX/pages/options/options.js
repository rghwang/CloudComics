// 페이지 컨트롤 템플릿에 대한 소개는 다음 문서를 참조하십시오.
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/options/options.html", {
        // 이 함수는 사용자가 이 페이지로 이동할 때마다 호출되어
        // 페이지 요소를 응용 프로그램 데이터로 채웁니다.
        ready: function (element, options) {
            // TODO: 페이지를 초기화합니다.

            var listView = element.querySelector(".folder-list").winControl;
            listView.itemDataSource = Data.options.folderList.dataSource;
            listView.itemTemplate = document.getElementById("folderListTemplate");
            listView.layout = new WinJS.UI.ListLayout();

            document.getElementById("add").addEventListener("click", function () {
                // Verify that we are currently not snapped, or that we can unsnap to open the picker
                var currentState = Windows.UI.ViewManagement.ApplicationView.value;
                if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
                    !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
                    // Fail silently if we can't unsnap
                    return;
                }

                // Create the picker object and set options
                var folderPicker = new Windows.Storage.Pickers.FolderPicker;
                folderPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.desktop;
                // Users expect to have a filtered view of their folders depending on the scenario.
                // For example, when choosing a documents folder, restrict the filetypes to documents for your application.
                folderPicker.fileTypeFilter.replaceAll([".jpg", ".png", ".jpeg"]);

                folderPicker.pickSingleFolderAsync().then(function (folder) {
                    if (folder) {
                        // Application now has read/write access to all contents in the picked folder (including sub-folder contents)
                        // Cache folder so the contents can be accessed at a later time
                        Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.addOrReplace("PickedFolderToken", folder);
                        Data.options.folderList.push({
                            title:folder.path
                        });
                    } else {
                        // The picker was dismissed with no selected file
                        WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
                    }
                });
            });
            document.getElementById("remove", function () {

            });
        },

        unload: function () {
            // TODO: 이 페이지에서 벗어나는 탐색에 응답합니다.
        },

        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            // TODO: viewState의 변경 내용에 응답합니다.
        }
    });
})();
