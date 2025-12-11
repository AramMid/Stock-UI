"use client";

interface NewsItem {
  time: string;
  source: string;
  title: string;
  isBreaking: boolean;
  category?: string;
  url: string; // Required URL for news article
}

interface NewsSectionProps {
  isDarkMode: boolean;
}

export default function NewsSection({ isDarkMode }: NewsSectionProps) {
  const vietnamStockNews: NewsItem[] = [
    {
      time: "22:21 • 10/12/2025",
      source: "NLĐ",
      title: "Chứng khoán Việt Nam không có bong bóng, xác suất tăng điểm tháng 12 tới 75%",
      isBreaking: true,
      category: "Phân tích",
      url: "https://nld.com.vn/chung-khoan-viet-nam-khong-co-bong-bong-xac-suat-tang-diem-thang-12-toi-75-196251210222120889.htm"
    },
    {
      time: "Cập nhật liên tục",
      source: "VnExpress",
      title: "Chứng khoán - VnExpress Kinh doanh",
      isBreaking: false,
      category: "Tin tức",
      url: "https://vnexpress.net/kinh-doanh/chung-khoan"
    },
    {
      time: "22:19 • 10/12/2025",
      source: "Báo Mới",
      title: "Thị trường chứng khoán ngày 10/12/2025: VN-Index giảm 28,19 điểm xuống 1.718,98 điểm",
      isBreaking: true,
      category: "Thị trường",
      url: "https://baomoi.com/thi-truong-chung-khoan-ngay-10-12-2025-vn-index-giam-28-19-diem-xuong-1-718-98-diem-c53976379.epi"
    },
    {
      time: "15:30 • 10/12/2025",
      source: "Tạp chí KT&TC",
      title: "Thoái vốn dồn dập, thị trường chứng khoán tháng 12 vào cao điểm",
      isBreaking: false,
      category: "Phân tích",
      url: "https://tapchikinhtetaichinh.vn/thoai-von-don-dap-thi-truong-chung-khoan-thang-12-vao-cao-diem-127432.html"
    },
    {
      time: "10:45 • 10/12/2025",
      source: "Vietstock",
      title: "Nhận định thị trường",
      isBreaking: false,
      category: "Phân tích",
      url: "https://vietstock.vn/nhan-dinh-thi-truong.htm"
    },
    {
      time: "Cập nhật liên tục",
      source: "Cafef",
      title: "Thị trường chứng khoán",
      isBreaking: false,
      category: "Tin tức",
      url: "https://cafef.vn/thi-truong-chung-khoan.chn"
    },
    {
      time: "09:15 • 10/12/2025",
      source: "VnEconomy",
      title: "Nhận định chứng khoán",
      isBreaking: false,
      category: "Phân tích",
      url: "https://vneconomy.vn/tag/nhan-dinh-chung-khoan"
    }
  ];

  // Function to open news article in new tab
  const openNewsArticle = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`border rounded overflow-hidden h-full transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#131722] border-[#2a2e39]"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div
          className={`px-4 py-3 border-b transition-colors duration-200 ${
            isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
          }`}
        >
          <h4
            className={`font-semibold text-sm transition-colors duration-200 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Tin tức thị trường chứng khoán Việt Nam
          </h4>
        </div>

        {/* News List */}
        <div className="flex-1 overflow-y-auto right-section-scrollbar">
          {vietnamStockNews.map((item, index) => (
            <div
              key={index}
              onClick={() => openNewsArticle(item.url)}
              className={`px-4 py-3 border-b cursor-pointer transition-colors duration-200 ${
                isDarkMode
                  ? "border-[#2a2e39] hover:bg-[#1e222d]"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {/* Time and Source */}
              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`text-xs transition-colors duration-200 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {item.time}
                </span>
                <span
                  className={`text-xs transition-colors duration-200 ${
                    isDarkMode ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  •
                </span>
                <span
                  className={`text-xs transition-colors duration-200 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {item.source}
                </span>
                {item.isBreaking && (
                  <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    MỚI
                  </span>
                )}
                {item.category && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    isDarkMode 
                      ? "bg-blue-900/50 text-blue-300" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {item.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <p
                className={`text-sm leading-relaxed transition-colors duration-200 ${
                  isDarkMode
                    ? "text-white hover:text-blue-400"
                    : "text-gray-900 hover:text-blue-600"
                }`}
              >
                {item.title}
              </p>
            </div>
          ))}

          {/* Load more indicator */}
          <div className="px-4 py-3 text-center">
            <button
              className={`text-xs transition-colors ${
                isDarkMode
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Xem thêm tin tức...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}