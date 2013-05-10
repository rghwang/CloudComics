(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/itemDetail/itemDetail.html", {
        // 이 함수는 사용자가 이 페이지로 이동할 때마다 호출되어
        // 페이지 요소를 응용 프로그램 데이터로 채웁니다.
        ready: function (element, options) {
            // 파일 한개 선택해서 들어올 때에 대한 처리(old version)
            if (options && options.files) {
                Data.setFolder(options.files);
                document.getElementById("cmd").style.visibility = "hidden";
            }

            if( options && options.item ) var item = options.item;
            else return;
            
            var flipView = loadFlipViewControl();


            // INFO: groupedItems 에서는 폴더를 포함한 itemsDataSource를 쓰지만, itemDetail에서는 filesDataSourc를 쓰기 때문에 FlipView의 인덱스 값을 구할 때 폴더만큼 빼주어야 함
            flipView.currentPage = item.index - Data.foldersTotal;

            flipView.onpageselected = function () {
                // 패스 업데이트
                //item = items.getAt(flipView.currentPage);
                //document.querySelector(".appbar_filename").innerText = item.storageItem.path;
                //document.getElementById("copy").disabled = false;
            }
            flipView.onpagecompleted = function () {
                document.getElementById("del").disabled = false;
            }

            document.getElementById("cmd").addEventListener("click", function () {
                WinJS.Navigation.back();
            });
            document.getElementById("del").addEventListener("click", function () {
                item.storageItem.deleteAsync().then(function () {
                    if (items.length > 1) {
                        Data.items.splice(Data.items.indexOf(item), 1);
                        flipView.itemDataSource = Data.getItemsFromGroup(Data.resolveGroupReference("files")).dataSource;

                        document.getElementById("del").disabled = true;

                    }else{
                        WinJS.Navigation.back();
                        return false;
                    }
                });
            });
            document.getElementById("copy").addEventListener("click", function () {
                var dp = new Windows.ApplicationModel.DataTransfer.DataPackage();
                dp.requestedOperation = Windows.ApplicationModel.DataTransfer.DataPackageOperation.copy;
                var txt = item.storageItem.path.substring(0, item.storageItem.path.lastIndexOf("\\"));
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
                        WinJS.Navigation.navigate(Application.navigator.home, { files: files });
                    } else {
                        // The picker was dismissed with no selected file
                        WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
                    }
                });

            });
        }
    });
    function loadFlipViewControl() {
        var container = document.getElementById("flipviewDiv");
        var flipViewOptions = {
            itemDataSource: Data.filesDataSource,
            itemTemplate: storageRenderer,
        };

        var flipViewControl = new WinJS.UI.FlipView(container, flipViewOptions);
        return flipViewControl;
    }
    function storageRenderer(itemPromise) {
        return itemPromise.then(function (item) {
            var div = document.createElement("div");
            div.className = "item-container";
            var img = document.createElement("img");
            img.src = URL.createObjectURL(item.data);
            img.className = "item-image";
            div.appendChild(img);
            return div;
        });
    }
})();
