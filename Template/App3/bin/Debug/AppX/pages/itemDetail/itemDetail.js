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
            var item = options && options.item ? Data.resolveItemReference(options.item) : Data.items.getAt(0);
            //element.querySelector(".titlearea .pagetitle").textContent = item.group.title;
            //element.querySelector("article .item-image").src = item.backgroundImage;
            //element.querySelector("article .item-image").alt = item.subtitle;
            //element.querySelector(".content").focus();

            var flipView = element.querySelector("#imageFlipView").winControl;
            var group = Data.resolveGroupReference("files");
            var items = Data.getItemsFromGroup(group);

            flipView.itemDataSource = items.dataSource;
            flipView.itemTemplate = itemTemplate;
            flipView.currentPage = items.indexOf(item);
            flipView.onpageselected = function () {
                item = items.getAt(flipView.currentPage);
                document.querySelector(".appbar_filename").innerText = item.storageItem.path;
                //document.getElementById("copy").disabled = false;
            }

            function getCurrentByClass(c) {
                return document.querySelector("div.win-template[aria-selected=true] ."+c);
            }
            flipView.onpagecompleted = function () {
                document.getElementById("del").disabled = false;


                var drag = false;
                var prevX, prevY;

                var con = getCurrentByClass("item-container");
                var img = getCurrentByClass("item-image");
                img.addEventListener("dragstart", function (e) {
                    e.preventDefault();
                });

                con.onmspointerdown = function (e) {
                    drag = true;
                    prevX = e.clientX;
                    prevY = e.clientY;
                }
                con.onmspointermove = function (e) {
                    if (drag) {
                        con.scrollLeft += prevX - e.clientX;
                        con.scrollTop += prevY - e.clientY;
                        prevX = e.clientX;
                        prevY = e.clientY;
                    }
                }
                con.onmspointerup = con.onmspointerout = function (e) {
                    drag = false;
                }
            }

            document.getElementById("cmd").addEventListener("click", function () {
                WinJS.Navigation.back();
            });
            // TODO: 현재 선택된 item-container를 제대로 선택
            document.getElementById("zoomin").addEventListener("click", function () {
                var con = getCurrentByClass("item-container");
                con.msContentZoomFactor *= 2;
            });
            document.getElementById("zoomout").addEventListener("click", function () {
                var con = getCurrentByClass("item-container");
                con.msContentZoomFactor *= 0.5;
            });
            document.getElementById("del").addEventListener("click", function () {
                item.storageItem.deleteAsync().then(function () {
                    if (items.length > 1) {
                        Data.items.splice(Data.items.indexOf(item), 1);
                        flipView.itemDataSource = Data.getItemsFromGroup(Data.resolveGroupReference("files")).dataSource;

                        document.getElementById("del").disabled = true;

                    } else {
                        WinJS.Navigation.back();
                        return false;
                    }
                });
            });
        }
    });
})();
