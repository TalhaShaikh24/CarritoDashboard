using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class InventoryCategoryController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Categories";
            ViewBag.PageSubtitle = "Manage your invertory categories";
            return View();
        }
    }
}
