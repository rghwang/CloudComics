// 페이지 컨트롤 템플릿에 대한 소개는 다음 문서를 참조하십시오.
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";
    var showOK = false;

    WinJS.UI.Pages.define("/pages/options/options.html", {
        // 이 함수는 사용자가 이 페이지로 이동할 때마다 호출되어
        // 페이지 요소를 응용 프로그램 데이터로 채웁니다.
        ready: function (element, options) {
            // TODO: 페이지를 초기화합니다.
            if (options && options.folderPath) showOK = true;
            else showOK = false;

            if (Data.currentApp.licenseInformation.isTrial) {
                Data.currentApp.loadListingInformationAsync().then(function (listing) {
                    document.querySelector("#trial_info").textContent = "Trial Version";
                    document.querySelector("#trial_txt").textContent = "Will be expired after " + Data.currentApp.licenseInformation.expirationDate.toLocaleDateString()
                    + ". Upgrade to the Full Version for " + listing.formattedPrice + ".";

                    document.querySelector("#purchase").disabled = false;
                });
                document.querySelector("#purchase").onclick = function () {
                    Data.currentApp.requestAppPurchaseAsync(false).then(
                        function () {
                            if (!Data.currentApp.licenseInformation.isTrial) {
                                updateVersionInfo();
                            }
                        }
                    );
                }
            } else {
                updateVersionInfo();
            }


            var listView = element.querySelector(".folder-list").winControl;
            listView.itemDataSource = Data.getAccessList().dataSource;
            listView.itemTemplate = document.getElementById("folderListTemplate");
            listView.layout = new WinJS.UI.ListLayout();



            listView.onselectionchanged = function () {
                if (listView.selection.count() > 0) document.getElementById("remove").removeAttribute("disabled");
                else document.getElementById("remove").setAttribute("disabled");
            }
            document.getElementById("remove").addEventListener("click", function () {
                Data.removeAccessList(listView.selection.getIndices());
            });
            document.getElementById("clear").addEventListener("click", function () {
                Data.clearAccessList();
            });
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

                        Data.addAccessList(folder);
                        if (options && options.folderPath) {

                            var path = Data.addRootSlash(options.folderPath);

                            if (path.indexOf(folder.path) !== -1) {
                                document.getElementById("OK_btn").style.visibility = "visible";
                                document.getElementById("OK_label").innerText = "Ready to view";
                                document.getElementById("OK_msg").innerText = "Okay, ready to view all images in \"" + options.folderPath + "\".";
                                document.getElementById("OK_btn").addEventListener("click", function () {
                                    WinJS.Navigation.history = {};
                                    SelectView.navigateToPath(path, options.fileName);
                                });
                            }
                        }
                    } else {
                        // The picker was dismissed with no selected file
                        WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
                    }
                });
            });
            if (showOK) {
                var msg = [
                    "If you add a parent folder, you don't need to add each folders to the list. In this case, " + options.parentFolder + " is recommended."
                    , "Add the image folder to Image Folders list"
                ];
                document.getElementById("OK").style.visibility = "visible";
                document.getElementById("OK_label").innerText = msg[1];
                document.getElementById("OK_btn").style.visibility = "hidden";
                document.getElementById("OK_msg").innerText = msg[0];
                new Windows.UI.Popups.MessageDialog(msg[0], msg[1]).showAsync();
            }
        },

        unload: function () {
            // TODO: 이 페이지에서 벗어나는 탐색에 응답합니다.
        },

        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            // TODO: viewState의 변경 내용에 응답합니다.
        }
    });
    function updateVersionInfo() {
        document.querySelector("#trial_info").textContent = "Full version";
        document.querySelector("#trial_txt").textContent = "Thank you for purchasing Viewing.";
        document.querySelector("#purchase").textContent = "Purchased";
        document.querySelector("#purchase").disabled = true;
    }
})();
