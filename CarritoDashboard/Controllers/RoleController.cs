using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class RoleController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Roles Management";
            ViewBag.PageSubtitle = "Define roles and assign permissions";
            return View();
        }
    }
}
