using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class OrderController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "All Orders";
            ViewBag.PageSubtitle = "Monitor and manage all customer orders";
            return View();
        }
    }
}
