using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class CustomerController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Customers";
            ViewBag.PageSubtitle = "Manage all registered customers";
            return View();
        }
    }
}
